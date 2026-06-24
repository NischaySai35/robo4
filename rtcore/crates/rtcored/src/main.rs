//! rtcored — the RT Core daemon, end-to-end demo of the industrial control path:
//!
//!   ROS 2 /joint_trajectory goal
//!        │  (ros-bridge)
//!        ▼
//!   internal trajectory topic ──► JointTrajectoryController (in ControllerManager)
//!        │                              │ PID @ 1 kHz
//!        ▼                              ▼
//!   ControllerManager.update ──► HardwareInterface (SimHardware; EtherCAT later)
//!        │
//!        ▼  measured JointState ──► internal state topic ──► ros-bridge ──► ROS /joint_states
//!
//! This is exactly the shape of the deployed system: the Studio (TS) plans a blended,
//! jerk-limited trajectory and sends it as a ROS-style goal; RT Core executes it
//! deterministically and streams state back. Run: `cargo run -p rtcored --release`.

use ros_bridge::{Bridge, BridgeTopics, RosMsg, SimRosTransport};
use rt_bus::Topic;
use rt_control::trajectory::JointTrajectory;
use rt_control::{
    ControllerManager, ControllerStatus, CyclicExecutor, HardwareInterface, HoldController,
    JointCommand, JointState, JointTrajectoryController, Pid, SafetyLimits, SafetyMonitor,
    SimHardware,
};
use rt_ethercat::SimEtherCatHardware;
use rt_telemetry::TelemetryServer;

const TELEMETRY_ADDR: &str = "127.0.0.1:8088";

fn main() {
    let dof = 3;
    let hz = 1000.0;
    let serve = std::env::args().any(|a| a == "--serve");
    let ethercat = std::env::args().any(|a| a == "--ethercat");

    // WebSocket telemetry to the Studio (runs off the control thread).
    let telemetry = TelemetryServer::start(TELEMETRY_ADDR).expect("telemetry bind");
    println!("telemetry: ws://{}/ (Studio RT Core tab)", telemetry.addr);

    // Internal bus topics.
    let state_topic: Topic<JointState> = Topic::new(64);
    let traj_topic: Topic<JointTrajectory> = Topic::new(4);
    let status_topic: Topic<ControllerStatus> = Topic::new(64);
    let estop_topic: Topic<bool> = Topic::new(8);
    let estop_sub = estop_topic.subscribe(); // the loop reads e-stop trip/reset here
    let traj_sub = traj_topic.subscribe(); // the controller reads incoming goals here

    // ROS bridge with an in-memory transport (real rclrs transport drops in later).
    let mut bridge = Bridge::new(
        SimRosTransport::new(),
        &state_topic,
        traj_topic.clone(),
        BridgeTopics::default(),
    );
    bridge.bridge_status(&status_topic); // stream controller feedback out to ROS
    bridge.bridge_estop(&estop_topic); // accept ROS /estop trip/reset commands in

    // The Studio (TS) plans a blended, jerk-limited trajectory and serializes it with
    // rtExport.ts. Here is exactly that wire format, parsed by traj-io — the real
    // Studio→RT Core hand-off. (Over ROS, this arrives as a /joint_trajectory goal.)
    let studio_json = r#"{
        "format": "rtcore.trajectory", "version": 1, "dof": 3,
        "joints": ["J1","J2","J3"], "dt": 0.5, "duration": 1.0,
        "points": [
            { "t": 0.0, "positions": [0.0, 0.0, 0.0] },
            { "t": 0.5, "positions": [0.3, -0.2, 0.1] },
            { "t": 1.0, "positions": [0.6, -0.4, 0.25] }
        ]
    }"#;
    let goal = traj_io::from_json(studio_json).expect("valid Studio trajectory");
    println!("parsed Studio trajectory: {} points, {:.2}s", goal.points.len(), goal.duration());
    bridge
        .transport_mut()
        .inject_incoming("/joint_trajectory", RosMsg::JointTrajectory(goal));

    // Control stack. Hardware backend: a plain integrator, or sim EtherCAT drives that
    // must be brought up through the CiA 402 state machine first (--ethercat).
    let mut hw: Box<dyn HardwareInterface> = if ethercat {
        let mut ec = SimEtherCatHardware::new(dof);
        let ok = ec.bring_up(200, 1.0 / hz);
        println!("EtherCAT (sim): {dof} CiA 402 axes brought up → {}", if ok { "Operation Enabled" } else { "FAILED" });
        Box::new(ec)
    } else {
        Box::new(SimHardware::new(dof))
    };
    let mut mgr = ControllerManager::new();
    // Software pre-safety layer: every command is clamped against these before the drives.
    let mut safety = SafetyMonitor::new(SafetyLimits {
        pos_min: vec![-1.0; dof],
        pos_max: vec![1.0; dof],
        vel_max: vec![5.0; dof],
        effort_max: vec![60.0; dof],
    });

    let exec = CyclicExecutor::new(hz);
    println!("rtcored: {hz:.0} Hz | ROS bridge + controller manager + sim hardware ({dof} DOF)");

    // First spin: pull the ROS goal onto the internal topic, build a controller for it, activate.
    bridge.spin();
    if let Some(t) = traj_sub.drain().into_iter().last() {
        let pid = Pid::new(dof, 90.0, 6.0, 14.0, 60.0);
        mgr.load(Box::new(JointTrajectoryController::new("arm_traj", t, pid)));
        mgr.activate("arm_traj");
        println!("loaded ROS trajectory goal into controller 'arm_traj'");
    }

    // Run ~1.5 s; each cycle: control → hardware → publish state → bridge to ROS.
    let cycles = (hz * 1.5) as u64;
    let stats = exec.run_realtime(cycles, |k, dt| {
        // Demonstrate e-stop over the bridge: a ROS node trips at 0.4 s, resets at 0.8 s.
        if k == 400 {
            bridge.transport_mut().inject_incoming("/estop", RosMsg::EStop(true));
        } else if k == 800 {
            bridge.transport_mut().inject_incoming("/estop", RosMsg::EStop(false));
        }

        let state = hw.read();
        let raw = mgr.update(&state, dt).unwrap_or(JointCommand { effort: vec![0.0; dof] });
        let cmd = safety.enforce(&state, raw); // software pre-safety guard
        hw.write(&cmd, dt);
        state_topic.publish(hw.read());
        if let Some(st) = mgr.active_status() {
            telemetry.publish(&traj_io::status_to_json(&st)); // → WebSocket → Studio RT Core tab
            status_topic.publish(st); // feedback → bridge → ROS /controller_status
        }
        bridge.spin();

        // Apply any e-stop commands the bridge routed in this cycle.
        for trip in estop_sub.drain() {
            if trip {
                safety.trip_estop();
            } else {
                safety.reset_estop();
            }
        }
    });

    let states_published = bridge.transport_mut().published("/joint_states").len();
    let status_published = bridge.transport_mut().published("/controller_status").len();
    let final_status = mgr.active_status();
    println!(
        "done: {} cycles | jitter mean {:.1} µs max {:.1} µs | {} JointState + {} status msgs out to ROS",
        stats.cycles, stats.mean_us, stats.max_us, states_published, status_published
    );
    if let Some(s) = final_status {
        let max_err = s.error.iter().fold(0.0_f64, |m, e| m.max(e.abs()));
        println!(
            "controller '{}': finished {} | progress {:.0}% | max tracking error {:.4} rad",
            s.name, s.finished, s.fraction * 100.0, max_err
        );
    }
    let sf = safety.status();
    println!(
        "safety: estop {} | effort clamps {} | velocity blocks {} | position blocks {}",
        sf.estop, sf.effort_clamps, sf.velocity_blocks, sf.position_blocks
    );
    println!("final joint positions: {:?}", hw.read().position);

    // --serve: keep running, holding the final pose and streaming telemetry, so the Studio
    // RT Core tab shows live data. (Without --serve we exit, which keeps tests/CI from hanging.)
    if serve {
        println!("--serve: operator console live on ws://{}/ — send trajectories / e-stop from the Studio (Ctrl+C to stop)", telemetry.addr);
        // start by holding the current pose; the Studio can then push new goals live
        let mut console = ControllerManager::new();
        console.load_and_activate(Box::new(HoldController::new("hold", hw.read().position, Pid::new(dof, 90.0, 6.0, 14.0, 60.0))));
        let exec2 = CyclicExecutor::new(hz);
        loop {
            // run in short batches so inbound commands are polled ~50×/s
            exec2.run_realtime(20, |_k, dt| {
                // INBOUND: trajectories / e-stop the Studio sent over the socket
                while let Some(raw_msg) = telemetry.try_recv() {
                    match traj_io::parse_inbound(&raw_msg) {
                        traj_io::Inbound::Trajectory(t) => {
                            let pid = Pid::new(dof, 90.0, 6.0, 14.0, 60.0);
                            console.load_and_activate(Box::new(JointTrajectoryController::new("arm_traj", t, pid)));
                            println!("operator: new trajectory goal received");
                        }
                        traj_io::Inbound::EStop(trip) => {
                            if trip { safety.trip_estop(); } else { safety.reset_estop(); }
                            println!("operator: e-stop {}", if trip { "TRIPPED" } else { "reset" });
                        }
                        traj_io::Inbound::Unknown => {}
                    }
                }

                let state = hw.read();
                let raw = console.update(&state, dt).unwrap_or(JointCommand { effort: vec![0.0; dof] });
                let cmd = safety.enforce(&state, raw);
                hw.write(&cmd, dt);
                if let Some(st) = console.active_status() {
                    telemetry.publish(&traj_io::status_to_json(&st));
                }
            });
        }
    }
}

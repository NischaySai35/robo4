# GOS and ROS 2: parity register

Hard requirement: there must be no situation where ROS 2 can do something and GOS cannot. Done means no row says **missing**, and every row has a passing test.

**Source:** the official documentation source, [`ros2/ros2_documentation`](https://github.com/ros2/ros2_documentation), branch `rolling`, read 31 Oct 2026. Section A is every row of `The-ROS2-Project/Features.rst`. Section B comes from the framework and developer-tool pages listed in that repo. `docs.ros.org` itself blocks automated reading.

**Not read yet:** the page bodies behind section B (only their titles and structure so far), and the `Capabilities` and `Integrations-and-related` folders. New rows are expected.

**Status:**
- **native:** exists in GOS and works outside the Studio, with a passing test.
- **bridge:** works through the G8 ROS 2 bridge, with a passing test.
- **partial:** real code exists but only inside the Studio, so it doesn't count as native.
- **missing:** nothing yet.

Today nothing can be **native**, because GOS doesn't exist outside the window yet. Tests named below are planned, not written.

## A. Official feature list

| # | ROS 2 feature | Status | What exists | Plan | Phase | Test |
|---|---|---|---|---|---|---|
| A1 | Discovery, transport, serialization over DDS | native | Zenoh discovery (liveliness), transport and JSON messages; DDS reached through the ROS 2 bridge | Zenoh discovery; DDS through the bridge | G2, G8 | `gos/python/tests/test_gos.py` |
| A2 | Multiple middleware implementations, chosen at runtime | partial | `gos.App(transport=...)`: local and Zenoh | More backends, shared memory | G2 | `transport_swap` |
| A3 | Common core library wrapped per language | native | Rust core with one C interface: Python through ctypes, Studio through WebAssembly | Node and C++ bindings later | G1 | `tools/test_mjcf.py`, `gos/python/tests` |
| A4 | Publish/subscribe over topics | partial | `runtime/messageBus.ts`; Python to Python over Zenoh passes (`test_two_processes_exchange_a_topic_over_zenoh`). Not yet Studio to Python. | Same API over transport | G2 | `pubsub_python_studio` |
| A5 | Clients and services | native | `app.services`, in one process or across processes over Zenoh, errors returned to the caller (`test_a_service_is_called_from_another_process`) | Same | G3 | `service_cross_process` |
| A6 | Set and retrieve parameters | native | `app.params` with type checks and events; other programs use `remote_params()` and `gos param` | Same, per node | G3 | `test_params_actions_and_cli_across_processes` |
| A7 | ROS 1 to ROS 2 bridge | missing | ROS 1 reached its end of life in 2025, and `ros1_bridge` is not available for ROS 2 Jazzy on Windows, so it could not be built or tested here. Possible on Linux with ROS 1 Noetic + ros1_bridge; Nischay to decide whether it is wanted | Reached through ROS 2's own bridge plus G8 | G8 | — |
| A8 | QoS for non-ideal networks | native | `topic(name, latched=, reliable=)` and `history(keep_last=N)`; late joiners get latched values across processes. Deadline and lifespan not offered | Reliable/best effort, keep-last, deadline, lifespan, liveliness | G2 | `test_qos_latched_keep_last_and_best_effort` |
| A9 | Inter- and intra-process with the same API | partial | In-process only | In-process and network behind one call | G2 | `same_api_both` |
| A10 | Composition of node components | native | Parts with `start(app)` share one App in one program (`gos.compose`, `gos launch` with "compose") | Load nodes into one process | G3, G9 | `test_composition_runs_parts_in_one_program` |
| A11 | Multiple executors, callback groups | native | `App(executor="single"|"multi")`, `spin()`, mutually exclusive groups | Executor design | G9 | `test_single_executor_runs_callbacks_only_when_spun` |
| A12 | Managed lifecycle nodes | native | `app.node(name)` with the ROS states, tested | Same 4 states | G3 | `lifecycle_states` |
| A13 | DDS-Security support | partial | Users and passwords on the Zenoh transport: strangers get no answers. No encryption (TLS) or per-topic permissions yet | Token first, then encryption and permissions | G9 | `test_password_protected_programs_refuse_strangers` |
| A14 | Extensible command-line tools | partial | `gos run, sim, graph, topic list/echo/pub, service list/call, param list/get/set, node list, action list, launch`. No plugin system yet | Plugins, more commands | G3 | `test_params_actions_and_cli_across_processes` |
| A15 | Launch system | native | `gos launch file.json|yaml`: starts programs, labels their output, stops them together | Graph file of nodes, wiring and scene | G3 | `test_launch_starts_and_stops_programs_together` |
| A16 | Namespaces for nodes and topics | native | `App(namespace=...)`: relative names live in the namespace | Native | G3 | `test_namespaces_and_remapping_keep_robots_apart` |
| A17 | Static remapping of names | native | `App(remap={...})` | Native | G9 | `test_namespaces_and_remapping_keep_robots_apart` |
| A18 | Demos of a complete mobile robot | partial | A stock ROS 2 node reads and commands the GOS robot through the bridge (`tools/test_ros2_bridge.py`). No full mobile demo yet |
| A19 | Preliminary real-time support | partial | `gos.Rate(hz)` loop with jitter report: 200 Hz on this Windows laptop, median 0.22 ms late, worst 0.56 ms (soft real time). Hard real time stays on the ESP32 firmware; real-time Linux not tested | ESP32 and real-time Linux | G6 | `test_rate_keeps_time_and_reports_jitter` |
| A20 | Bare-metal microcontrollers | partial | ESP32 firmware, no GOS client | GOS client on the ESP32. Needs Nischay's approval for `firmware/`. | G6, G9 | `esp32_client` |
| A21 | Content-filtering subscriptions | native | `subscribe(fn, where=test)` | Native filter | G9 | `test_content_filter_and_logging` |
| A22 | Service introspection | native | `App(introspect=True)`: every call and answer, or error, on `/_events<service>` | CLI | G9 | `test_service_calls_can_be_watched` |
| A23 | Action introspection | native | Actions run over services, so their goal, cancel and result calls show on `/_events` too; feedback is a normal topic | CLI | G9 | `test_service_calls_can_be_watched` |
| A24 | Pluggable buffer backends (e.g. GPU memory) | partial | Large arrays go through shared memory, only a handle travels (`app.arrays`). GPU memory not offered | Buffer interface, shared memory and GPU | G2, G9 | `test_big_arrays_pass_through_shared_memory_and_traces_are_written` |

## B. Framework and tool pages

| # | ROS 2 area | Status | What exists | Plan | Phase | Test |
|---|---|---|---|---|---|---|
| B1 | Actions | native | `app.actions`: goal, feedback, cancel, result, across processes | Over transport | G3 | `test_params_actions_and_cli_across_processes` |
| B2 | Interfaces: `.msg`, `.srv`, `.action`, generation | partial | Hand-written `idl.ts` exporter | One schema, generated types | G2 | `generated_types_roundtrip` |
| B3 | tf2 | partial | Transform **graph** in the Rust core: several paths, loop gap reported (`app.loop_check`, tested). Not yet time-stamped or streamed like tf2; the Studio still uses `runtime/tf.ts` | Transform **graph** reporting loop mismatch | G3 | `tf_loop_mismatch` |
| B4 | Domain ID | native | `App(domain=N)`: groups never hear each other | Native | G2 | `test_domains_keep_groups_apart` |
| B5 | Discovery details | native | Zenoh liveliness: what is running appears and disappears with the program | Zenoh | G2 | `test_params_actions_and_cli_across_processes` |
| B6 | Logging and logger config | native | `app.logger()`: levels, one `/rosout` stream from every program | Levels, files, per-node config | G3 | `test_content_filter_and_logging` |
| B7 | Executors | native | Same as A11 | See A11 | G9 | `test_exclusive_group_never_overlaps` |
| B8 | Middleware internals (`rmw`) | native | `gos/transport.py`: one small interface (publish, subscribe, serve, request, announce, discover) with in-process and Zenoh implementations, chosen per App | Transport interface | G2 | `test_two_processes_exchange_a_topic_over_zenoh` |
| B9 | Build tools, packages, cross-compiling, variants (`colcon`, `ament`, `rosdep`) | partial | `gos pkg new NAME` makes a package (part, launch file, test, pyproject); GOS itself installs with pip. No workspace build tool or dependency resolver like colcon/rosdep | GOS packages | G9 | `test_new_package_runs_and_passes_its_own_test` |
| B10 | Testing tools | partial | `tsx --test` | Testing helpers for users' nodes | G9 | `user_node_test` |
| B11 | Debugging, tracing, backtraces | partial | `App(trace=path)`: every callback timed, opens in Perfetto. Backtraces are Python's own | Tracing, then Studio panels | G9 | `test_big_arrays_pass_through_shared_memory_and_traces_are_written` |
| B12 | Introspection, examine traffic, publish from YAML | partial | CLI lists topics, services, params, nodes and actions and echoes topics. Traffic statistics and publishing from YAML files not done | CLI first | G3, G9 | `test_params_actions_and_cli_across_processes` |
| B13 | Visualization (RViz, `rqt`) | partial | A script opens the app as a 3D view only and drives it live (`tools/test_gos_view.py`, packaged app). No plots or rqt-style panels yet. | Client mode, `gos view` | G5 | `view_from_python` |
| B14 | Package documentation | partial | `gos doc NAME` prints the docs from the code. No generated website yet | GOS docs tooling | G9 | `test_new_package_runs_and_passes_its_own_test` |
| B15 | Recording (`rosbag`) | native | `app.record` and `app.play` to MCAP, tested. Converter for old `.nischaybag` not done. | MCAP | G3 | `record_play` |
| B16 | Robot description (URDF, SDF) | partial | MJCF export keeps loops and loads with meshes, checked in MuJoCo. URDF and SDF still lose loops, with a warning for URDF. | Import, SDF warnings | G1 | `tools/test_mjcf.py` |
| B17 | Sim time | native | `/clock` published by the simulation; `app.now()`, `follow_clock()` | Over transport | G3 | `test_sim_clock_is_published_and_followed` |
| B18 | `ros2_control` | partial | `gos.control.joint_trajectory_controller`: follows timed poses as an action, on the sim and on the real robot through `attach_robot`; cancel stops. Only this one controller; no controller manager; real robot untested | Hardware interface | G6 | `test_trajectory_controller_follows_poses_and_can_be_cancelled` |
| B19 | MoveIt-style planning | partial | `robotics/msrr2`, `robotics/planning` | GraphIK, collision, planner | G4, G5 | `plan_closed_chain` |
| B20 | Nav2, perception, community packages | partial | Bridge carries `sensor_msgs/JointState` both ways and mirrors any GOS topic as JSON strings; other message types not yet. |
| B21 | Fleet, multi-machine | partial | `App(network=True)`: programs find each other by multicast. Tested on one computer, not across two machines | Network transport | G2, G9 | `test_programs_find_each_other_on_the_network_without_addresses` |

**Count at 31 Oct evening:** see the rows. Native only where a test passes outside the Studio. The goal is no missing rows.

## Beyond ROS

These don't count toward parity, and tree-based tools can't express them. See `RESTRUCTURING.md` §10.6.

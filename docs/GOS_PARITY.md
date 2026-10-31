# GOS and ROS 2: parity register

Hard requirement: there must be no situation where ROS 2 can do something and GOS cannot. Done means no row says **missing**, and every row has a passing test.

**Source:** the official documentation source, [`ros2/ros2_documentation`](https://github.com/ros2/ros2_documentation), branch `rolling`, read 31 Oct 2026. Section A is every row of `The-ROS2-Project/Features.rst`. Section B comes from the framework and developer-tool pages listed in that repo. `docs.ros.org` itself blocks automated reading.

**Not read yet:** the page bodies behind section B (only their titles and structure so far), and the `Capabilities` and `Integrations-and-related` folders. New rows are expected.

**Status:**
- **native:** exists in GOS and works outside the Studio, with a passing test.
- **bridge:** works through the G8 ROS 2 bridge, with a passing test.
- **partial:** real code exists but only inside the Studio, so it doesn't count as native.
- **missing:** nothing yet.
- **not wanted:** left out on Nischay's decision; does not count as missing.

Today nothing can be **native**, because GOS doesn't exist outside the window yet. Tests named below are planned, not written.

## A. Official feature list

| # | ROS 2 feature | Status | What exists | Plan | Phase | Test |
|---|---|---|---|---|---|---|
| A1 | Discovery, transport, serialization over DDS | native | Zenoh discovery (liveliness), transport and JSON messages; DDS reached through the ROS 2 bridge | Zenoh discovery; DDS through the bridge | G2, G8 | `gos/python/tests/test_gos.py` |
| A2 | Multiple middleware implementations, chosen at runtime | partial | `gos.App(transport=...)`: local and Zenoh | More backends, shared memory | G2 | `transport_swap` |
| A3 | Common core library wrapped per language | native | Rust core with one C interface: Python through ctypes, Studio through WebAssembly | Node and C++ bindings later | G1 | `tools/test_mjcf.py`, `gos/python/tests` |
| A4 | Publish/subscribe over topics | native | `runtime/messageBus.ts`; Python to Python over Zenoh passes (`test_two_processes_exchange_a_topic_over_zenoh`). Studio and Python both ways through the Studio link, no echo (`tools/test_studio_topics.py`). | Same API over transport | G2 | `pubsub_python_studio` |
| A5 | Clients and services | native | `app.services`, in one process or across processes over Zenoh, errors returned to the caller (`test_a_service_is_called_from_another_process`) | Same | G3 | `service_cross_process` |
| A6 | Set and retrieve parameters | native | `app.params` with type checks and events; other programs use `remote_params()` and `gos param` | Same, per node | G3 | `test_params_actions_and_cli_across_processes` |
| A7 | ROS 1 to ROS 2 bridge | not wanted | Nischay, 31 Oct 2026: ROS 2 only. ROS 1 is end-of-life, so nothing is built for it | — | — | — |
| A8 | QoS for non-ideal networks | native | `topic(name, latched=, reliable=)` and `history(keep_last=N)`; late joiners get latched values across processes. Deadline and lifespan not offered | Reliable/best effort, keep-last, deadline, lifespan, liveliness | G2 | `test_qos_latched_keep_last_and_best_effort` |
| A9 | Inter- and intra-process with the same API | native | The same part runs unchanged in one program (local or Zenoh) and answering another program | In-process and network behind one call | G2 | `test_same_code_in_one_program_and_across_programs` |
| A10 | Composition of node components | native | Parts with `start(app)` share one App in one program (`gos.compose`, `gos launch` with "compose") | Load nodes into one process | G3, G9 | `test_composition_runs_parts_in_one_program` |
| A11 | Multiple executors, callback groups | native | `App(executor="single"|"multi")`, `spin()`, mutually exclusive groups | Executor design | G9 | `test_single_executor_runs_callbacks_only_when_spun` |
| A12 | Managed lifecycle nodes | native | `app.node(name)` with the ROS states, tested | Same 4 states | G3 | `lifecycle_states` |
| A13 | DDS-Security support | partial | Encrypted links with certificates checked on both sides (`gos certs new`, `tls/` endpoints): programs without a certificate from the same authority are refused. Passwords too. No per-topic permissions yet | Token first, then encryption and permissions | G9 | `test_password_protected_programs_refuse_strangers` |
| A14 | Extensible command-line tools | native | `gos run, sim, graph, topic list/echo/pub, service list/call, param list/get/set, node list, action list, launch`. Plugins: an entry point in `gos.commands`, or a `gos-NAME` program on PATH, becomes `gos NAME`; `gos plugins` lists them | Plugins, more commands | G3 | `test_params_actions_and_cli_across_processes` |
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
| B2 | Interfaces: `.msg`, `.srv`, `.action`, generation | native | `gos.interfaces` reads ROS-format .msg/.srv/.action files (built-in and the user's); `app.topic(..., type=...)` refuses wrong messages saying which field; `gos interfaces ts` writes the Studio types, checked current by the test | One schema, generated types | G2 | `test_message_types_are_checked_and_generated` |
| B3 | tf2 | native | `gos.tf`: Broadcaster (and static), a Buffer keeping N seconds per edge, `lookup(from, to, t)` interpolating position and turn, `robot_state_publisher` from the simulation. The Rust core finds the path and reports loop gaps when a camera and the joints disagree. The Studio still uses its own `runtime/tf.ts` for display | Time-stamped, streamed | G1, G3 | `test_tf_over_time_interpolates_streams_and_reports_gaps` |
| B4 | Domain ID | native | `App(domain=N)`: groups never hear each other | Native | G2 | `test_domains_keep_groups_apart` |
| B5 | Discovery details | native | Zenoh liveliness: what is running appears and disappears with the program | Zenoh | G2 | `test_params_actions_and_cli_across_processes` |
| B6 | Logging and logger config | native | `app.logger()`: levels, one `/rosout` stream from every program | Levels, files, per-node config | G3 | `test_content_filter_and_logging` |
| B7 | Executors | native | Same as A11 | See A11 | G9 | `test_exclusive_group_never_overlaps` |
| B8 | Middleware internals (`rmw`) | native | `gos/transport.py`: one small interface (publish, subscribe, serve, request, announce, discover) with in-process and Zenoh implementations, chosen per App | Transport interface | G2 | `test_two_processes_exchange_a_topic_over_zenoh` |
| B9 | Build tools, packages, cross-compiling, variants (`colcon`, `ament`, `rosdep`) | partial | `gos pkg new NAME` makes a package (part, launch file, test, pyproject); GOS itself installs with pip. No workspace build tool or dependency resolver like colcon/rosdep | GOS packages | G9 | `test_new_package_runs_and_passes_its_own_test` |
| B10 | Testing tools | native | `gos.testing`: `collect(app, topic)` and `wait_until(...)` with failures that say what was expected; `gos pkg new` makes a package with its own test | Testing helpers for users' nodes | G9 | `test_same_code_in_one_program_and_across_programs` |
| B11 | Debugging, tracing, backtraces | partial | `App(trace=path)`: every callback timed, opens in Perfetto. Backtraces are Python's own | Tracing, then Studio panels | G9 | `test_big_arrays_pass_through_shared_memory_and_traces_are_written` |
| B12 | Introspection, examine traffic, publish from YAML | partial | CLI lists topics, services, params, nodes and actions and echoes topics. `gos topic stats` measures rate and size; `gos topic pub --file` publishes from JSON or YAML. No live bandwidth view in the Studio yet | CLI first | G3, G9 | `test_params_actions_and_cli_across_processes` |
| B13 | Visualization (RViz, `rqt`) | partial | A script opens the app as a 3D view only and drives it live (`tools/test_gos_view.py`, packaged app). No plots or rqt-style panels yet. | Client mode, `gos view` | G5 | `view_from_python` |
| B14 | Package documentation | native | `gos doc NAME` prints the docs; `gos doc --html DIR` writes a page per module plus an index | GOS docs tooling | G9 | `test_new_package_runs_and_passes_its_own_test` |
| B15 | Recording (`rosbag`) | native | `app.record` and `app.play` to MCAP, tested. Converter for old `.nischaybag` not done. | MCAP | G3 | `record_play` |
| B16 | Robot description (URDF, SDF) | partial | MJCF and SDF exports keep rings; SDF also imports (File > Import > SDF Model), and the real module exported, read back and exported again gives the same file apart from mesh shapes (`tools/test_sdf_import.py`). URDF import and export; URDF cannot hold a ring (a limit of the format, as in ROS), so ring joints are dropped with a warning. No xacro yet | xacro | G1 | `tools/test_mjcf.py`, `sdf.test.ts`, `tools/test_sdf_import.py` |
| B17 | Sim time | native | `/clock` published by the simulation; `app.now()`, `follow_clock()` | Over transport | G3 | `test_sim_clock_is_published_and_followed` |
| B18 | `ros2_control` | native | Trajectory controller (an action), position controller (a topic), joint state broadcaster, and a controller manager that switches them while running and refuses two active controllers on one joint (also as services for other programs). All drive the sim and the real robot through `app.move`. Velocity and effort controllers are left out on purpose: the servos take positions | Hardware interface | G6 | `test_trajectory_controller_follows_poses_and_can_be_cancelled` |
| B19 | MoveIt-style planning | partial | `robotics/msrr2`, `robotics/planning` | GraphIK, collision, planner | G4, G5 | `plan_closed_chain` |
| B20 | Nav2, perception, community packages | native | The bridge converts any ROS 2 message type field by field both ways (`--to-ros`, `--from-ros`), lets ROS 2 clients call GOS services (`--service`), and sends gos.tf to ROS /tf, so Nav2, RViz and perception nodes work with GOS. Tested with a stock ROS 2 program: joints, Twist both ways, SetBool service, /tf (`tools/test_ros2_bridge.py`). ROS 2 action goals run as GOS actions with feedback, result and cancel |
| B21 | Fleet, multi-machine | partial | `App(network=True)`: programs find each other by multicast. Tested on one computer, not across two machines | Network transport | G2, G9 | `test_programs_find_each_other_on_the_network_without_addresses` |

**Count at 31 Oct evening:** see the rows. Native only where a test passes outside the Studio. The goal is no missing rows.

## Beyond ROS

These don't count toward parity, and tree-based tools can't express them. See `RESTRUCTURING.md` §10.6.

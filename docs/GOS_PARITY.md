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
| A1 | Discovery, transport, serialization over DDS | missing | | Zenoh discovery; DDS through the bridge | G2, G8 | `discovery_two_processes` |
| A2 | Multiple middleware implementations, chosen at runtime | partial | `gos.App(transport=...)`: local and Zenoh | More backends, shared memory | G2 | `transport_swap` |
| A3 | Common core library wrapped per language | native | Rust core with one C interface: Python through ctypes, Studio through WebAssembly | Node and C++ bindings later | G1 | `tools/test_mjcf.py`, `gos/python/tests` |
| A4 | Publish/subscribe over topics | partial | `runtime/messageBus.ts`; Python to Python over Zenoh passes (`test_two_processes_exchange_a_topic_over_zenoh`). Not yet Studio to Python. | Same API over transport | G2 | `pubsub_python_studio` |
| A5 | Clients and services | partial | `runtime/services.ts` | Same | G3 | `service_cross_process` |
| A6 | Set and retrieve parameters | partial | `runtime/params.ts` | Same, per node | G3 | `param_cross_process` |
| A7 | ROS 1 to ROS 2 bridge | missing | | Reached through ROS 2's own bridge plus G8 | G8 | `ros1_via_bridge` |
| A8 | QoS for non-ideal networks | partial | Latching only | Reliable/best effort, keep-last, deadline, lifespan, liveliness | G2 | `qos_matrix` |
| A9 | Inter- and intra-process with the same API | partial | In-process only | In-process and network behind one call | G2 | `same_api_both` |
| A10 | Composition of node components | missing | | Load nodes into one process | G3, G9 | `compose_at_runtime` |
| A11 | Multiple executors, callback groups | missing | | Executor design | G9 | `executor_groups` |
| A12 | Managed lifecycle nodes | missing | | Same 4 states | G3 | `lifecycle_states` |
| A13 | DDS-Security support | missing | | Token first, then encryption and permissions | G9 | `security_rejects_stranger` |
| A14 | Extensible command-line tools | partial | `gos run`, `graph show`, `sim`, `topic echo` | Plugins, more commands | G3 | `test_cli_runs_a_script_with_no_window` |
| A15 | Launch system | missing | | Graph file of nodes, wiring and scene | G3 | `launch_graph_file` |
| A16 | Namespaces for nodes and topics | missing | | Native | G3 | `namespace_isolation` |
| A17 | Static remapping of names | missing | | Native | G9 | `remap_names` |
| A18 | Demos of a complete mobile robot | missing | | TETROBOT demo; a ROS mobile robot through the bridge | G8 | `demo_end_to_end` |
| A19 | Preliminary real-time support | missing | Hard loop on the ESP32 | ESP32 and real-time Linux | G6 | `jitter_measured` |
| A20 | Bare-metal microcontrollers | partial | ESP32 firmware, no GOS client | GOS client on the ESP32. Needs Nischay's approval for `firmware/`. | G6, G9 | `esp32_client` |
| A21 | Content-filtering subscriptions | missing | | Native filter | G9 | `content_filter` |
| A22 | Service introspection | missing | | CLI | G9 | `service_introspect` |
| A23 | Action introspection | missing | | CLI | G9 | `action_introspect` |
| A24 | Pluggable buffer backends (e.g. GPU memory) | missing | | Buffer interface, shared memory and GPU | G2, G9 | `gpu_buffer_transport` |

## B. Framework and tool pages

| # | ROS 2 area | Status | What exists | Plan | Phase | Test |
|---|---|---|---|---|---|---|
| B1 | Actions | partial | `runtime/actions.ts` | Over transport | G3 | `action_cross_process` |
| B2 | Interfaces: `.msg`, `.srv`, `.action`, generation | partial | Hand-written `idl.ts` exporter | One schema, generated types | G2 | `generated_types_roundtrip` |
| B3 | tf2 | partial | `runtime/tf.ts`, a tree | Transform **graph** reporting loop mismatch | G3 | `tf_loop_mismatch` |
| B4 | Domain ID | missing | | Native | G2 | `domain_isolation` |
| B5 | Discovery details | missing | | Zenoh | G2 | `discovery_two_processes` |
| B6 | Logging and logger config | missing | | Levels, files, per-node config | G3 | `log_levels` |
| B7 | Executors | missing | | See A11 | G9 | `executor_groups` |
| B8 | Middleware internals (`rmw`) | missing | | Transport interface | G2 | `transport_swap` |
| B9 | Build tools, packages, cross-compiling, variants (`colcon`, `ament`, `rosdep`) | missing | | GOS packages | G9 | `package_build` |
| B10 | Testing tools | partial | `tsx --test` | Testing helpers for users' nodes | G9 | `user_node_test` |
| B11 | Debugging, tracing, backtraces | missing | | Tracing, then Studio panels | G9 | `trace_run` |
| B12 | Introspection, examine traffic, publish from YAML | missing | Node-graph data in `messageBus.ts` | CLI first | G3, G9 | `cli_smoke` |
| B13 | Visualization (RViz, `rqt`) | partial | Studio animation view inside the window | Client mode, `gos view` | G5 | `view_from_python` |
| B14 | Package documentation | missing | | GOS docs tooling | G9 | `docs_build` |
| B15 | Recording (`rosbag`) | partial | `runtime/recorder.ts`, `.nischaybag` | MCAP | G3 | `record_play` |
| B16 | Robot description (URDF, SDF) | partial | MJCF export keeps loops and loads with meshes, checked in MuJoCo. URDF and SDF still lose loops, with a warning for URDF. | Import, SDF warnings | G1 | `tools/test_mjcf.py` |
| B17 | Sim time | partial | `runtime/clock.ts` | Over transport | G3 | `sim_clock_cross_process` |
| B18 | `ros2_control` | missing | Direct ESP32 calls | Hardware interface | G6 | `same_script_sim_real` |
| B19 | MoveIt-style planning | partial | `robotics/msrr2`, `robotics/planning` | GraphIK, collision, planner | G4, G5 | `plan_closed_chain` |
| B20 | Nav2, perception, community packages | partial | `robotics/nav` | Bridge first | G8 | `stock_node_talks` |
| B21 | Fleet, multi-machine | missing | | Network transport | G2, G9 | `two_machines` |

**Count at 31 Oct evening:** see the rows. Native only where a test passes outside the Studio. The goal is no missing rows.

## Beyond ROS

These don't count toward parity, and tree-based tools can't express them. See `RESTRUCTURING.md` §10.6.

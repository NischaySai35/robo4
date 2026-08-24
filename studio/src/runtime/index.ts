/**
 * runtime/ — TETROBOT's native robotics runtime (our ROS 2 core, in-process).
 *
 * A single observable substrate every panel, simulator, planner and hardware link
 * talks through: a pub/sub message bus, a parameter server, services, actions, a
 * transform tree, a virtual clock, and session record/playback. This is the keystone
 * that turns single-shot feature demos into one coherent, observable system.
 *
 * Pure: no React, no Three (TF uses Three only for math but stays node-importable).
 */
export { bus, MessageBus, Topics, type Envelope, type TopicStats } from './messageBus';
export { clock, Clock, type ClockSource } from './clock';
export { params, ParameterServer, type ParamSpec, type ParamValue } from './params';
export { services, ServiceRegistry } from './services';
export { actions, ActionRegistry, type GoalHandle, type GoalStatus } from './actions';
export { tf, TransformTree, type Transform } from './tf';
export { recorder, player, Recorder, Player, type Bag } from './recorder';

//! rt-bus — a minimal, deterministic publish/subscribe bus for in-process real-time
//! messaging. This is the role ROS 2 fills with DDS topics, but without the middleware:
//! no discovery, no serialization, no network — just typed, bounded, lock-light queues
//! between the control loop and everything else (planners, loggers, the Studio bridge).
//!
//! Quality-of-Service today: a bounded per-subscriber ring (depth N) that drops the
//! OLDEST message on overflow — i.e. "keep last N", the QoS a real-time control consumer
//! wants (never block the producer, always have the freshest data).
//!
//! A `Topic<T>` is cheaply cloneable (shared handle); clone it to every task that needs
//! to publish or subscribe. Each `subscribe()` returns an independent reader.
//!
//! NOTE (roadmap): the cross-process / cross-host transport (shared memory on-host, an
//! RTPS-compatible wire between hosts) layers on top of this same API later; consumers
//! written against `Topic`/`Subscription` won't change.

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

/// A typed topic. Clone to share between publishers and subscribers.
pub struct Topic<T> {
    inner: Arc<TopicInner<T>>,
}

struct TopicInner<T> {
    subs: Mutex<Vec<Arc<Mutex<VecDeque<T>>>>>,
    depth: usize,
}

impl<T> Clone for Topic<T> {
    fn clone(&self) -> Self {
        Topic { inner: Arc::clone(&self.inner) }
    }
}

impl<T: Clone> Topic<T> {
    /// Create a topic whose subscribers each keep at most `depth` unread messages
    /// (oldest dropped on overflow). `depth` is clamped to at least 1.
    pub fn new(depth: usize) -> Self {
        Topic {
            inner: Arc::new(TopicInner {
                subs: Mutex::new(Vec::new()),
                depth: depth.max(1),
            }),
        }
    }

    /// Publish a message to every current subscriber (each gets its own clone).
    /// Never blocks: on a full subscriber queue the oldest message is dropped.
    pub fn publish(&self, msg: T) {
        let subs = self.inner.subs.lock().unwrap();
        for s in subs.iter() {
            let mut q = s.lock().unwrap();
            if q.len() >= self.inner.depth {
                q.pop_front();
            }
            q.push_back(msg.clone());
        }
    }

    /// Register a new independent reader.
    pub fn subscribe(&self) -> Subscription<T> {
        let q = Arc::new(Mutex::new(VecDeque::with_capacity(self.inner.depth)));
        self.inner.subs.lock().unwrap().push(Arc::clone(&q));
        Subscription { q }
    }

    /// Number of live subscribers.
    pub fn subscriber_count(&self) -> usize {
        self.inner.subs.lock().unwrap().len()
    }
}

/// An independent reader of a `Topic`.
pub struct Subscription<T> {
    q: Arc<Mutex<VecDeque<T>>>,
}

impl<T> Subscription<T> {
    /// Pop the oldest unread message, if any.
    pub fn try_recv(&self) -> Option<T> {
        self.q.lock().unwrap().pop_front()
    }

    /// Pop and return every unread message, oldest first.
    pub fn drain(&self) -> Vec<T> {
        let mut q = self.q.lock().unwrap();
        q.drain(..).collect()
    }

    /// Number of unread messages currently queued.
    pub fn len(&self) -> usize {
        self.q.lock().unwrap().len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delivers_to_all_subscribers_in_order() {
        let topic = Topic::new(8);
        let a = topic.subscribe();
        let b = topic.subscribe();
        assert_eq!(topic.subscriber_count(), 2);

        topic.publish(1);
        topic.publish(2);
        topic.publish(3);

        assert_eq!(a.drain(), vec![1, 2, 3]);
        assert_eq!(b.drain(), vec![1, 2, 3]);
    }

    #[test]
    fn bounded_queue_drops_oldest_on_overflow() {
        let topic = Topic::new(2); // keep-last-2
        let s = topic.subscribe();
        for i in 0..5 {
            topic.publish(i);
        }
        // only the two freshest survive
        assert_eq!(s.drain(), vec![3, 4]);
    }

    #[test]
    fn late_subscriber_misses_earlier_messages() {
        let topic = Topic::new(8);
        topic.publish(10); // no subscribers yet → dropped
        let s = topic.subscribe();
        topic.publish(20);
        assert_eq!(s.drain(), vec![20]);
    }

    #[test]
    fn try_recv_pops_one_at_a_time() {
        let topic = Topic::new(8);
        let s = topic.subscribe();
        topic.publish("a".to_string());
        topic.publish("b".to_string());
        assert_eq!(s.try_recv(), Some("a".to_string()));
        assert_eq!(s.len(), 1);
        assert_eq!(s.try_recv(), Some("b".to_string()));
        assert_eq!(s.try_recv(), None);
        assert!(s.is_empty());
    }
}

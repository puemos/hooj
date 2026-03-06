use crate::domain::segment::Segment;

const MAX_HISTORY: usize = 50;

#[derive(Debug)]
pub struct History {
    undo_stack: Vec<Vec<Segment>>,
    redo_stack: Vec<Vec<Segment>>,
}

impl History {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }

    /// Push the current state before a mutation.
    pub fn push(&mut self, segments: Vec<Segment>) {
        self.undo_stack.push(segments);
        if self.undo_stack.len() > MAX_HISTORY {
            self.undo_stack.remove(0);
        }
        self.redo_stack.clear();
    }

    /// Undo: pop from undo stack, push current state to redo, return previous state.
    pub fn undo(&mut self, current: Vec<Segment>) -> Option<Vec<Segment>> {
        if let Some(previous) = self.undo_stack.pop() {
            self.redo_stack.push(current);
            Some(previous)
        } else {
            None
        }
    }

    /// Redo: pop from redo stack, push current state to undo, return next state.
    pub fn redo(&mut self, current: Vec<Segment>) -> Option<Vec<Segment>> {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(current);
            Some(next)
        } else {
            None
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}

impl Default for History {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_segments(ids: &[&str]) -> Vec<Segment> {
        ids.iter()
            .map(|id| Segment {
                id: id.to_string(),
                start_time: 0.0,
                end_time: 10.0,
                speed: 1.0,
                volume: 1.0,
            })
            .collect()
    }

    #[test]
    fn test_undo_redo_basic() {
        let mut history = History::new();

        let state0 = make_segments(&["a"]);
        let state1 = make_segments(&["a", "b"]);
        let state2 = make_segments(&["a", "b", "c"]);

        // Push state0 before mutating to state1
        history.push(state0.clone());
        // Push state1 before mutating to state2
        history.push(state1.clone());

        assert!(history.can_undo());

        // Undo from state2 -> should get state1
        let restored = history.undo(state2.clone()).unwrap();
        assert_eq!(restored.len(), 2);
        assert_eq!(restored[0].id, "a");
        assert_eq!(restored[1].id, "b");

        // Redo from state1 -> should get state2
        assert!(history.can_redo());
        let redone = history.redo(restored).unwrap();
        assert_eq!(redone.len(), 3);
    }

    #[test]
    fn test_undo_empty() {
        let mut history = History::new();
        let current = make_segments(&["a"]);
        assert!(!history.can_undo());
        assert!(history.undo(current).is_none());
    }

    #[test]
    fn test_redo_empty() {
        let mut history = History::new();
        let current = make_segments(&["a"]);
        assert!(!history.can_redo());
        assert!(history.redo(current).is_none());
    }

    #[test]
    fn test_push_clears_redo() {
        let mut history = History::new();

        let s0 = make_segments(&["a"]);
        let s1 = make_segments(&["a", "b"]);
        let s2 = make_segments(&["a", "b", "c"]);

        history.push(s0.clone());
        // Undo
        let restored = history.undo(s1.clone()).unwrap();
        assert!(history.can_redo());

        // New push should clear redo
        history.push(restored);
        assert!(!history.can_redo());

        let _ = s2;
    }

    #[test]
    fn test_max_history() {
        let mut history = History::new();
        for i in 0..60 {
            history.push(make_segments(&[&format!("s{}", i)]));
        }
        assert_eq!(history.undo_stack.len(), 50);
    }
}

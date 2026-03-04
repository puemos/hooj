use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    pub id: String,
    pub start_time: f64,
    pub end_time: f64,
    pub speed: f64,
    pub volume: f64,
}

impl Segment {
    pub fn new(start_time: f64, end_time: f64) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            start_time,
            end_time,
            speed: 1.0,
            volume: 1.0,
        }
    }

    pub fn duration(&self) -> f64 {
        (self.end_time - self.start_time) / self.speed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_segment() {
        let seg = Segment::new(5.0, 15.0);
        assert_eq!(seg.start_time, 5.0);
        assert_eq!(seg.end_time, 15.0);
        assert_eq!(seg.speed, 1.0);
        assert_eq!(seg.volume, 1.0);
        assert!(!seg.id.is_empty());
    }

    #[test]
    fn test_duration_normal_speed() {
        let seg = Segment::new(0.0, 10.0);
        assert!((seg.duration() - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_duration_double_speed() {
        let mut seg = Segment::new(0.0, 10.0);
        seg.speed = 2.0;
        assert!((seg.duration() - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_duration_half_speed() {
        let mut seg = Segment::new(0.0, 10.0);
        seg.speed = 0.5;
        assert!((seg.duration() - 20.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_unique_ids() {
        let a = Segment::new(0.0, 10.0);
        let b = Segment::new(0.0, 10.0);
        assert_ne!(a.id, b.id);
    }
}

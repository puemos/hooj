use std::sync::Mutex;

use crate::application::history::History;
use crate::domain::project::Project;

pub struct AppState {
    pub project: Mutex<Option<Project>>,
    pub history: Mutex<History>,
    pub temp_dir: String,
}

impl AppState {
    pub fn new() -> Self {
        let temp_dir = std::env::temp_dir()
            .join("hooj")
            .to_string_lossy()
            .to_string();

        let _ = std::fs::create_dir_all(&temp_dir);

        Self {
            project: Mutex::new(None),
            history: Mutex::new(History::new()),
            temp_dir,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

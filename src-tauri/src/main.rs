// Release builds must not pop a console window on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    entry_agents_lib::run()
}

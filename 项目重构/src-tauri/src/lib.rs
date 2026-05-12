mod commands;
mod models;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    services::storage::ensure_data_dirs().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ffmpeg::ffmpeg_execute,
            commands::ffmpeg::ffmpeg_execute_with_progress,
            commands::ffmpeg::ffmpeg_stop,
            commands::ffmpeg::ffmpeg_get_media_info,
            commands::ffmpeg::ffmpeg_validate_path,
            commands::ffmpeg::ffmpeg_check_global,
            commands::ffmpeg::ffmpeg_scan_folder_videos,
            commands::ffmpeg::ffmpeg_merge_videos,
            commands::ffmpeg::ffmpeg_classify_by_fps,
            commands::ffmpeg::ffmpeg_collect_subfolder_videos,
            commands::ffmpeg::ffmpeg_extract_frame,
            commands::ollama::ollama_check_status,
            commands::ollama::ollama_get_models,
            commands::ollama::ollama_pull_model,
            commands::ollama::ollama_delete_model,
            commands::ollama::ollama_chat,
            commands::ollama::lmstudio_check_status,
            commands::ollama::lmstudio_get_models,
            commands::ollama::check_local_service,
            commands::file::file_read,
            commands::file::file_write,
            commands::file::file_delete,
            commands::file::file_create_folder,
            commands::file::file_rename,
            commands::file::file_get_stats,
            commands::file::file_show_in_folder,
            commands::storage::get_models,
            commands::storage::save_models,
            commands::storage::get_conversations,
            commands::storage::save_conversations,
            commands::storage::storage_get_module_path,
            commands::storage::storage_save_module_path,
            commands::storage::storage_check_all_paths,
            commands::storage::storage_get_data_dir_info,
            commands::storage::storage_get_config,
            commands::storage::storage_update_config,
            commands::storage::storage_get_ffmpeg_config,
            commands::storage::storage_save_ffmpeg_config,
            commands::storage::storage_create_backup,
            commands::storage::storage_restore_backup,
            commands::storage::storage_list_backups,
            commands::storage::storage_delete_backup,
            commands::storage::storage_ensure_dirs,
            commands::storage::storage_reset_to_factory,
            commands::storage::get_prompt_templates,
            commands::storage::save_prompt_templates,
            commands::gallery::get_albums,
            commands::gallery::get_gallery_data_dir,
            commands::gallery::select_folder,
            commands::gallery::list_files_in_folder,
            commands::gallery::save_album,
            commands::gallery::create_album_with_folder,
            commands::gallery::delete_album,
            commands::gallery::get_images,
            commands::gallery::save_image,
            commands::gallery::delete_image,
            commands::gallery::update_image_favorite,
            commands::gallery::upload_image,
            commands::gallery::read_image_file,
            commands::gallery::import_image_from_path,
            commands::gallery::import_image_to_album,
            commands::gallery::get_all_images_json,
            commands::gallery::get_database_file_path,
            commands::gallery::batch_import_images,
            commands::wallpaper::get_wallpapers,
            commands::wallpaper::get_active_wallpaper,
            commands::wallpaper::add_wallpaper_from_path,
            commands::wallpaper::add_wallpaper_from_url,
            commands::wallpaper::delete_wallpaper,
            commands::wallpaper::clear_all_wallpapers,
            commands::wallpaper::set_active_wallpaper,
            commands::wallpaper::clear_active_wallpaper,
            commands::wallpaper::get_wallpaper_setting,
            commands::wallpaper::set_wallpaper_setting,
            commands::wallpaper::read_wallpaper_file,
            commands::video::get_video_playlists,
            commands::video::save_video_playlists,
            commands::video::get_all_playlists_json,
            commands::video::get_data_dir,
            commands::video::create_video_playlist,
            commands::video::add_video_to_playlist,
            commands::video::remove_video_from_playlist,
            commands::video::delete_video_playlist,
            commands::video::get_multi_video_layouts,
            commands::video::save_multi_video_layouts,
            commands::video::create_multi_video_layout,
            commands::video::add_video_to_layout,
            commands::video::update_layout_video,
            commands::video::delete_multi_video_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

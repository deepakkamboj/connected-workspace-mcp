# Tool Reference

## Gmail

| Tool                   | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `gmail_search`         | Search with Gmail query syntax and return summaries |
| `gmail_get_message`    | Read headers and decoded message text               |
| `gmail_send_message`   | Send a plain-text email                             |
| `gmail_reply`          | Reply within an existing thread                     |
| `gmail_modify_message` | Add or remove labels such as `UNREAD` or `STARRED`  |

## Google Calendar

| Tool                    | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `calendar_list_events`  | List ordered events in a time range               |
| `calendar_create_event` | Schedule an event and optionally notify attendees |
| `calendar_update_event` | Patch selected fields on an event                 |
| `calendar_delete_event` | Delete an event                                   |
| `calendar_free_busy`    | Read busy periods for one or more calendars       |

## Google Sheets

| Tool                        | Purpose                                |
| --------------------------- | -------------------------------------- |
| `sheets_get_spreadsheet`    | Read spreadsheet metadata              |
| `sheets_read_range`         | Read an A1-notation range              |
| `sheets_batch_read`         | Read multiple ranges                   |
| `sheets_write_range`        | Replace values in a range              |
| `sheets_append_rows`        | Append rows                            |
| `sheets_clear_range`        | Clear values in a range                |
| `sheets_create_spreadsheet` | Create a spreadsheet with named sheets |

## Google Drive

| Tool                  | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `drive_search_files`  | Search files with Drive query syntax        |
| `drive_get_file`      | Read file metadata                          |
| `drive_create_folder` | Create a folder                             |
| `drive_copy_file`     | Copy a file                                 |
| `drive_share_file`    | Grant user, group, domain, or public access |
| `drive_trash_file`    | Move a file to trash                        |

## Google Contacts

| Tool              | Purpose                              |
| ----------------- | ------------------------------------ |
| `contacts_list`   | List contacts with pagination        |
| `contacts_search` | Search contacts                      |
| `contacts_get`    | Read a contact by resource name      |
| `contacts_create` | Create a contact                     |
| `contacts_update` | Replace all supported contact fields |
| `contacts_delete` | Permanently delete a contact         |

`contacts_update` reads current contact source metadata before writing.
Optionally supply the `etag` from `contacts_get` to reject updates if the
contact has changed. Omitted email, phone, and organization fields are cleared,
not preserved.

## Google Tasks

| Tool                   | Purpose                    |
| ---------------------- | -------------------------- |
| `tasks_list_tasklists` | List task lists            |
| `tasks_list`           | List tasks in a list       |
| `tasks_create`         | Create a task              |
| `tasks_update`         | Patch selected task fields |
| `tasks_complete`       | Mark a task complete       |
| `tasks_delete`         | Permanently delete a task  |

## LinkedIn

| Tool                      | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `linkedin_get_profile`    | Read the authenticated OpenID profile         |
| `linkedin_list_posts`     | List posts authored by the member             |
| `linkedin_get_post`       | Read a post by URN                            |
| `linkedin_get_engagement` | Read available social action summaries        |
| `linkedin_publish_text`   | Publish a text post                           |
| `linkedin_publish_image`  | Upload a local image and publish it with text |
| `linkedin_delete_post`    | Permanently delete an owned post              |

## Write Safety

Sending email, modifying labels, creating/updating/deleting events, changing
spreadsheets, files, contacts, or tasks, and publishing/deleting posts change
live provider data. Sharing Drive files can expose private information.
Configure your MCP host to
require confirmation for write tools. Automated Jest tests mock every provider
and never perform these actions on real accounts.

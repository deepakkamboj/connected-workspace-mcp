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

Sending email, modifying labels, creating/updating/deleting events, and
publishing/deleting posts change live provider data. Configure your MCP host to
require confirmation for write tools. Automated Jest tests mock every provider
and never perform these actions on real accounts.

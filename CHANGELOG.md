# Changelog

## 1.0.0 — 2026-06-16

### Added
- Modular source layout (`client/`, `handlers/`, `config/`, `utils/`)
- SID, cookie, password, and API key authentication with `check_auth` tool
- Setup scripts for MCP client configuration (`setup-sid`, `setup-auth`, `verify-auth`)
- GitHub Actions CI (build + typecheck on Node 20 and 22)

### Changed
- Package renamed to `erpnext-mcp-server` (bin alias `erpnext-server` retained)
- Production-ready `package.json` for npm and GitHub releases

### Tools
- `get_doctypes`, `get_doctype_fields`, `get_documents`, `get_document`
- `create_document`, `update_document`, `delete_document`
- `submit_document`, `cancel_document`
- `call_method`, `run_report`, `check_auth`

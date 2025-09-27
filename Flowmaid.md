# Flowmaid Syntax Specification

## File Structure

```markdown
# Root Node Title [key=value, key2=value2]

## Secondary Node [attributes]
  - List Item 1 [attributes]
  - List Item 2 [attributes]
    - Sub List Item [attributes]

## Another Secondary Node
  - Other Content

---
metadata:
  key: value
  key2: value2
```

## Title Syntax

```markdown
# Level 1 Title [attributes]
## Level 2 Title [attributes]
### Level 3 Title [attributes]
#### Level 4 Title [attributes]
```

## List Item Syntax

```markdown
- Regular List Item [attributes]
  - Indented Sub-item [attributes] (2-space indent)
    - Deeper Sub-item [attributes] (4-space indent)
```

## Attribute Syntax

- Format: `[key=value, key2=value2, key3=value3]`
- Supported Data Types:
  - String: `text="string"` or `text=string` (quotes optional if no spaces)
  - Number: `progress=85`, `width=2000`
  - Boolean: `completed=true`, `active=false`
  - Percentage: `completion=95%`
  - Date: `date=2024-01-10`
  - Icon: `icon=🚀`, `icon=📝`

## Common Attribute Keys

### General Attributes

```markdown
[color=#FF6B6B, shape=ellipse, fontSize=28, icon=🚀]
```

- `color`: Node color (hexadecimal, color names)
- `shape`: Node shape (`ellipse`, `rectangle`, `diamond`, `circle`)
- `fontSize`: Font size
- `icon`: Icon emoji
- `priority`: Priority level (`high`, `medium`, `low`)

### Progress Related

```markdown
[progress=75, assignee=John, team=Frontend Team]
```

- `progress`: Progress percentage (0-100)
- `assignee`: Assignee
- `team`: Responsible team
- `status`: Status (`completed`, `in-progress`, `pending`)

### Data Related

```markdown
[date=2024-01-20, participants=8, responses=150]
```

- `date`: Date
- `participants`: Number of participants
- `responses`: Number of responses
- `competitors`: Number of competitors

### Technical Related

```markdown
[services=8, complexity=high, type=relational]
```

- `services`: Number of services
- `complexity`: Complexity level (`low`, `medium`, `high`)
- `type`: Type description
- `version`: Version number

## Metadata Block

YAML format metadata at the end of the file:

```markdown
---
metadata:
  title: "Document Title"
  author: "Author Name"
  version: "Version Number"
  created: "Creation Date"
  theme: "Theme Name"
  layout: "Layout Type"
  backgroundColor: "Background Color"
  width: Canvas Width
  height: Canvas Height
  description: "Description"
---
```

## Complete Example

```markdown
# Project Plan [color=#4ECDC4, shape=ellipse, priority=high]

## Requirements Phase [progress=100]
  - User Research [date=2024-01-10, participants=5]
  - Requirements Analysis [assignee=John, status=completed]
    - Functional Requirements
    - Non-functional Requirements

## Development Phase [progress=75, team=Dev Team]
  - Frontend Development [progress=80, assignee=Jane]
  - Backend Development [progress=70, assignee=Mike]

## Testing Phase [progress=30]
  - Unit Testing [testCases=50]
  - Integration Testing [scenarios=10]

---
metadata:
  title: "Project Plan Mind Map"
  author: "Project Manager"
  version: "1.0"
  theme: "modern"
  layout: "mindmap"
  backgroundColor: "#F8F9FA"
```

## Syntax Rules

1. **Indentation Rules**: Use spaces for indentation, 2 spaces per level
2. **Attribute Separation**: Separate attributes with commas, no spaces around equals sign
3. **String Quotes**: Use quotes when values contain spaces or special characters
4. **Comment Support**: Use `//` for single-line comments
5. **Empty Lines**: Empty lines are ignored by the parser

## Notes

- Ensure correct format for key-value pairs
- Avoid unescaped special characters in node text
- Metadata block must be at the end of the file
- Maintain consistent indentation style
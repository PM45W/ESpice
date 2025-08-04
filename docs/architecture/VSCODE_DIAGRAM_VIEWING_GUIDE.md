# VS Code Mermaid Diagram Viewing Guide

## 🎯 Quick Start - View Diagrams in VS Code

### **Method 1: Mermaid Preview Extension (Recommended)**

1. **Install the Extension:**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Mermaid Preview"
   - Install "Mermaid Preview" by Matt Bierner

2. **View Diagrams:**
   - Open any `.md` file with Mermaid diagrams
   - Press `Ctrl+Shift+P` (or Cmd+Shift+P on Mac)
   - Type "Mermaid Preview: Open Preview"
   - Select the command to open the preview

3. **Alternative Method:**
   - Right-click in the editor
   - Select "Mermaid Preview: Open Preview"

### **Method 2: Markdown Preview Enhanced**

1. **Install Extension:**
   - Search for "Markdown Preview Enhanced"
   - Install by Yiyi Wang

2. **View Diagrams:**
   - Open the markdown file
   - Press `Ctrl+Shift+V` to open preview
   - Mermaid diagrams will render automatically

### **Method 3: Built-in Markdown Preview**

1. **Open Preview:**
   - Open any `.md` file
   - Press `Ctrl+Shift+V` (or Cmd+Shift+V on Mac)
   - Or click the preview icon in the top-right corner

2. **Note:** Basic Mermaid support is included in newer VS Code versions

## 🔧 VS Code Settings for Better Diagram Viewing

### **Add to VS Code Settings (settings.json):**

```json
{
    "markdown.preview.breaks": true,
    "markdown.preview.fontSize": 14,
    "markdown.preview.lineHeight": 1.6,
    "mermaid-preview.theme": "default",
    "mermaid-preview.backgroundColor": "#ffffff"
}
```

### **Workspace Settings:**
Create `.vscode/settings.json` in your project root:

```json
{
    "markdown.preview.breaks": true,
    "mermaid-preview.theme": "default",
    "files.associations": {
        "*.md": "markdown"
    }
}
```

## 📁 File Organization for Easy Viewing

### **Current Structure:**
```
docs/
├── architecture/
│   ├── ESpice_Architecture_Diagram.md    ← Main diagrams
│   ├── ESpice_Presentation.md            ← Presentation version
│   ├── ESpice_Diagrams.html              ← Interactive HTML
│   └── VSCODE_DIAGRAM_VIEWING_GUIDE.md   ← This guide
```

### **Recommended Viewing Order:**
1. **ESpice_Architecture_Diagram.md** - Complete technical diagrams
2. **ESpice_Presentation.md** - Presentation-ready version
3. **ESpice_Diagrams.html** - Interactive browser version

## 🚀 Quick Commands for VS Code

### **Keyboard Shortcuts:**
- `Ctrl+Shift+V` - Open Markdown Preview
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+Shift+X` - Extensions Panel

### **Useful Commands:**
- `Mermaid Preview: Open Preview`
- `Markdown: Open Preview`
- `Markdown: Open Preview to the Side`

## 📊 Viewing Specific Diagrams

### **1. System Overview Architecture**
```bash
# Open in VS Code
code docs/architecture/ESpice_Architecture_Diagram.md
# Then press Ctrl+Shift+V
```

### **2. Interactive HTML Version**
```bash
# Open in browser
start docs/architecture/ESpice_Diagrams.html
```

### **3. Presentation Version**
```bash
# Open in VS Code
code docs/architecture/ESpice_Presentation.md
# Then press Ctrl+Shift+V
```

## 🔧 Troubleshooting

### **Diagrams Not Rendering?**
1. **Check Extension Installation:**
   - Ensure Mermaid Preview is installed
   - Restart VS Code after installation

2. **Check Mermaid Syntax:**
   - Ensure code blocks start with ````mermaid`
   - Verify diagram syntax is correct

3. **Update VS Code:**
   - Use the latest VS Code version
   - Update extensions regularly

### **Performance Issues?**
1. **Large Files:**
   - Split large markdown files
   - Use separate files for different diagram types

2. **Memory Usage:**
   - Close unused previews
   - Restart VS Code if needed

## 🎨 Customization Options

### **Mermaid Theme Options:**
```json
{
    "mermaid-preview.theme": "default"     // or "dark", "forest", "neutral"
}
```

### **Background Colors:**
```json
{
    "mermaid-preview.backgroundColor": "#ffffff",
    "markdown.preview.backgroundColor": "#ffffff"
}
```

### **Font Settings:**
```json
{
    "markdown.preview.fontSize": 14,
    "markdown.preview.lineHeight": 1.6
}
```

## 📱 Mobile Viewing

### **For Mobile Devices:**
1. **Use the HTML Version:**
   - Open `ESpice_Diagrams.html` in a mobile browser
   - Responsive design works on all devices

2. **VS Code Web:**
   - Use VS Code Web version
   - Access through GitHub Codespaces

## 🔗 Alternative Viewing Methods

### **1. GitHub/GitLab:**
- Push to repository
- View directly in GitHub/GitLab (native Mermaid support)

### **2. Notion:**
- Copy Mermaid code blocks
- Paste into Notion (supports Mermaid)

### **3. Obsidian:**
- Open markdown files in Obsidian
- Native Mermaid support

### **4. Typora:**
- Open markdown files in Typora
- Live preview with Mermaid support

## 🎯 Best Practices

### **For Development:**
1. **Use Mermaid Preview Extension** for real-time editing
2. **Keep diagrams in separate sections** for better organization
3. **Use consistent naming** for diagram titles
4. **Test rendering** after making changes

### **For Presentations:**
1. **Use the HTML version** for live demos
2. **Export to PDF** from markdown preview
3. **Use presentation mode** in VS Code
4. **Prepare backup screenshots** for offline viewing

## 📋 Quick Reference

### **Essential Extensions:**
- ✅ Mermaid Preview (Matt Bierner)
- ✅ Markdown Preview Enhanced (Yiyi Wang)
- ✅ Markdown All in One (Yu Zhang)

### **Keyboard Shortcuts:**
- `Ctrl+Shift+V` - Markdown Preview
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+Shift+X` - Extensions

### **File Locations:**
- Main Diagrams: `docs/architecture/ESpice_Architecture_Diagram.md`
- Presentation: `docs/architecture/ESpice_Presentation.md`
- Interactive: `docs/architecture/ESpice_Diagrams.html`

---

## 🚀 Quick Start Commands

```bash
# Open main architecture diagrams
code docs/architecture/ESpice_Architecture_Diagram.md

# Open interactive HTML version
start docs/architecture/ESpice_Diagrams.html

# Open presentation version
code docs/architecture/ESpice_Presentation.md
```

**Then press `Ctrl+Shift+V` to view the diagrams!** 
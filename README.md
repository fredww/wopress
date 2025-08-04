# Markdown WordPress Publisher

A desktop application for publishing Markdown files to WordPress sites. Built with Electron and Node.js.

## Features

- 🔧 **Easy Configuration**: Simple GUI to configure WordPress connection settings
- 📁 **Directory Scanning**: Automatically scan directories for Markdown files
- 🏗️ **Category Hierarchy**: Automatically create WordPress categories based on folder structure
- 🏷️ **Frontmatter Support**: Support for YAML frontmatter (title, tags, date, excerpt, slug)
- 📊 **Progress Tracking**: Real-time progress updates during publishing
- 📝 **Detailed Logging**: Comprehensive logging of all operations
- 💾 **Publish Records**: Track published files to avoid duplicates
- ✅ **Connection Testing**: Test WordPress API connection before publishing

## Prerequisites

- Node.js (version 16 or higher)
- WordPress site with REST API enabled
- WordPress Application Password for authentication

## Installation

1. Clone or download this project
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Building Executables

Build for current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

## Configuration

1. **WordPress URL**: Your WordPress site's REST API endpoint (e.g., `https://yoursite.com/wp-json/wp/v2`)
2. **Username**: Your WordPress username
3. **App Password**: WordPress Application Password (not your regular password)
4. **Scan Directory**: Directory containing your Markdown files
5. **Record File**: JSON file to track published articles (optional)

### Creating WordPress Application Password

1. Go to your WordPress admin dashboard
2. Navigate to Users → Profile
3. Scroll down to "Application Passwords"
4. Enter a name for the application (e.g., "Markdown Publisher")
5. Click "Add New Application Password"
6. Copy the generated password (it will only be shown once)

## Markdown File Structure

### Basic Markdown
```markdown
# Article Title

Your content here...
```

### With Frontmatter
```markdown
---
title: "My Article Title"
date: "2024-01-15"
tags: ["tag1", "tag2"]
excerpt: "Brief description of the article"
slug: "my-article-slug"
---

# My Article Title

Your content here...
```

## Directory Structure for Categories

The application automatically creates WordPress categories based on your folder structure:

```
posts/
├── ai-learning-hub/
│   ├── machine-learning/
│   │   └── intro-to-ml.md      # Category: AI Learning Hub → Machine Learning
│   └── deep-learning/
│       └── neural-networks.md  # Category: AI Learning Hub → Deep Learning
└── tutorials/
    └── getting-started.md      # Category: Tutorials
```

## Supported Frontmatter Fields

- `title`: Article title (overrides H1 heading)
- `date`: Publication date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
- `tags`: Array of tags
- `excerpt`: Article excerpt/summary
- `slug`: URL slug for the article

## Troubleshooting

### Connection Issues
- Verify your WordPress URL is correct and includes `/wp-json/wp/v2`
- Ensure your Application Password is correct
- Check if your WordPress site has REST API enabled
- Verify your username is correct

### Publishing Issues
- Check file permissions in the scan directory
- Ensure Markdown files have proper encoding (UTF-8)
- Verify category names don't contain special characters

### Performance
- For large numbers of files, consider publishing in smaller batches
- The application automatically handles rate limiting and timeouts

## File Structure

```
Wopress/
├── src/
│   ├── main.js           # Electron main process
│   ├── preload.js        # Preload script for security
│   ├── publisher.js      # WordPress publishing logic
│   └── renderer/
│       ├── index.html    # Main UI
│       ├── styles.css    # Application styles
│       └── app.js        # Frontend logic
├── package.json          # Dependencies and scripts
├── config.json          # User configuration (auto-generated)
└── README.md            # This file
```

## License

MIT License - feel free to use and modify as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter any issues:
1. Check the application logs in the Log section
2. Verify your WordPress configuration
3. Test the connection using the "Test Connection" button
4. Check the console for additional error details (in development mode)
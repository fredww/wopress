const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { marked } = require('marked');
const yaml = require('yaml');

class WordPressPublisher {
  constructor(config) {
    this.config = config;
    this.baseURL = config.remoteUrl.replace(/\/$/, '');
    this.auth = {
      username: config.remoteUser,
      password: config.remotePassword
    };
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}/${endpoint.replace(/^\//, '')}`;
    
    try {
      const response = await axios({
        method,
        url,
        data,
        auth: this.auth,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 0
      };
    }
  }

  async findOrCreateTag(name) {
    const slug = this.sanitizeTitle(name);
    
    // Search for existing tag
    const searchResult = await this.makeRequest(`tags?slug=${encodeURIComponent(slug)}`);
    if (searchResult.success && searchResult.data.length > 0) {
      return searchResult.data[0].id;
    }
    
    // Create new tag
    const createResult = await this.makeRequest('tags', 'POST', {
      name: name,
      slug: slug
    });
    
    if (createResult.success) {
      return createResult.data.id;
    }
    
    return null;
  }

  async findOrCreateCategory(name, slug, parentId = 0) {
    // Search by name first
    const searchResult = await this.makeRequest(`categories?search=${encodeURIComponent(name)}&per_page=100`);
    if (searchResult.success && searchResult.data.length > 0) {
      for (const category of searchResult.data) {
        if (category.name === name && parseInt(category.parent) === parseInt(parentId)) {
          return category.id;
        }
      }
    }
    
    // Search by slug
    const slugResult = await this.makeRequest(`categories?slug=${encodeURIComponent(slug)}&per_page=100`);
    if (slugResult.success && slugResult.data.length > 0) {
      for (const category of slugResult.data) {
        if (category.name === name && parseInt(category.parent) === parseInt(parentId)) {
          return category.id;
        }
      }
    }
    
    // Create new category
    const categoryData = {
      name: name,
      slug: slug
    };
    
    if (parentId > 0) {
      categoryData.parent = parentId;
    }
    
    const createResult = await this.makeRequest('categories', 'POST', categoryData);
    
    if (createResult.success) {
      return createResult.data.id;
    } else if (createResult.status === 400 && createResult.error.includes('term_exists')) {
      // Handle existing term case
      return 1; // fallback to uncategorized
    }
    
    return 1; // fallback to uncategorized
  }

  async getCategoryWithParents(categoryId) {
    const categoryIds = [categoryId];
    
    const result = await this.makeRequest(`categories/${categoryId}`);
    if (result.success && result.data.parent > 0) {
      const parentIds = await this.getCategoryWithParents(result.data.parent);
      categoryIds.push(...parentIds);
    }
    
    return categoryIds;
  }

  async getCategoryId(categoryPath) {
    const parts = categoryPath.split('/');
    let parentId = 0;
    
    // Handle ai-learning-hub special case
    if (parts.length > 1 && parts[0] === 'ai-learning-hub') {
      const slug = 'ai-learning-hub';
      const categoryName = 'AI Learning Hub';
      parentId = await this.findOrCreateCategory(categoryName, slug, parentId);
      parts.shift(); // Remove first element
    }
    
    // Process each level of hierarchy
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;
      
      const slug = this.sanitizeTitle(trimmedPart);
      const categoryName = this.formatCategoryName(trimmedPart);
      
      parentId = await this.findOrCreateCategory(categoryName, slug, parentId);
      
      if (parentId <= 1) {
        return 1;
      }
    }
    
    return parentId;
  }

  sanitizeTitle(title) {
    let slug = title.toLowerCase();
    slug = slug.replace(/[^a-z0-9\-_]/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-|-$/g, '');
    return slug;
  }

  formatCategoryName(part) {
    return part.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n(.*?)\n---\s*\n(.*)/s;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        const frontmatter = yaml.parse(match[1]);
        const markdown = match[2];
        return { frontmatter, markdown, hasFrontmatter: true };
      } catch (error) {
        console.error('Error parsing frontmatter:', error);
        return { frontmatter: {}, markdown: content, hasFrontmatter: false };
      }
    }
    
    return { frontmatter: {}, markdown: content, hasFrontmatter: false };
  }

  async publishMarkdownFile(filePath, defaultCategoryName, publishedRecords) {
    const hash = this.getFileHash(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    const { frontmatter, markdown, hasFrontmatter } = this.parseFrontmatter(content);
    
    let title;
    let processedMarkdown = markdown;
    
    if (hasFrontmatter && frontmatter.title) {
      title = frontmatter.title;
      // Remove H1 if it matches title
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedMarkdown = processedMarkdown.replace(new RegExp(`^#\\s+${escapedTitle}\\s*\\n`, 'm'), '');
    } else {
      // Extract first H1 as title
      const h1Match = processedMarkdown.match(/^#\s+(.+)\n?/m);
      if (h1Match) {
        title = h1Match[1].trim();
        processedMarkdown = processedMarkdown.replace(/^#\s+.+\n?/m, '');
      } else {
        title = path.basename(filePath, '.md');
      }
    }
    
    const key = `${title}_${hash}`;
    if (publishedRecords[key]) {
      return { success: true, message: `Already published: ${title}`, skipped: true };
    }
    
    const htmlContent = marked(processedMarkdown);
    const categoryId = await this.getCategoryId(defaultCategoryName);
    const categoryIds = await this.getCategoryWithParents(categoryId);
    
    const postData = {
      title: title,
      content: htmlContent,
      status: 'publish',
      categories: categoryIds
    };
    
    // Process frontmatter data
    if (hasFrontmatter) {
      if (frontmatter.slug) {
        postData.slug = frontmatter.slug;
      }
      
      if (frontmatter.date) {
        let date = frontmatter.date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          date = `${date}T12:00:00`;
        }
        postData.date = date;
      }
      
      if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
        const tagIds = [];
        for (const tagName of frontmatter.tags) {
          const tagId = await this.findOrCreateTag(tagName);
          if (tagId) {
            tagIds.push(tagId);
          }
        }
        if (tagIds.length > 0) {
          postData.tags = tagIds;
        }
      }
      
      if (frontmatter.excerpt) {
        postData.excerpt = frontmatter.excerpt;
      }
    }
    
    const result = await this.makeRequest('posts', 'POST', postData);
    
    if (result.success) {
      publishedRecords[key] = {
        title: title,
        hash: hash,
        file: filePath,
        category: defaultCategoryName,
        time: new Date().toISOString()
      };
      
      return {
        success: true,
        message: `Successfully published: ${title}`,
        data: result.data
      };
    } else {
      return {
        success: false,
        message: `Failed to publish: ${title}`,
        error: result.error
      };
    }
  }
}

async function testConnection(config) {
  try {
    const publisher = new WordPressPublisher(config);
    const result = await publisher.makeRequest('posts?per_page=1');
    
    if (result.success) {
      return { success: true, message: 'Connection successful!' };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function scanMarkdownFiles(directory) {
  try {
    const files = [];
    
    async function scanDir(dir, relativePath = '') {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scanDir(fullPath, path.join(relativePath, item));
        } else if (path.extname(item).toLowerCase() === '.md') {
          const relativeFilePath = path.join(relativePath, item);
          const categoryPath = relativePath || 'uncategorized';
          
          files.push({
            path: fullPath,
            relativePath: relativeFilePath,
            name: item,
            category: categoryPath,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
    
    await scanDir(directory);
    
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function publishMarkdownFiles(config, files, progressCallback) {
  const publisher = new WordPressPublisher(config);
  const recordFile = config.record_file || path.join(__dirname, '../published_records.json');
  
  // Load existing records
  let publishedRecords = {};
  try {
    if (await fs.pathExists(recordFile)) {
      publishedRecords = await fs.readJson(recordFile);
    }
  } catch (error) {
    console.error('Error loading published records:', error);
  }
  
  const results = [];
  let processed = 0;
  
  for (const file of files) {
    const result = await publisher.publishMarkdownFile(
      file.path,
      file.category,
      publishedRecords
    );
    
    results.push({
      file: file.name,
      ...result
    });
    
    processed++;
    
    if (progressCallback) {
      progressCallback({
        processed,
        total: files.length,
        current: file.name,
        result
      });
    }
  }
  
  // Save updated records
  try {
    await fs.writeJson(recordFile, publishedRecords, { spaces: 2 });
  } catch (error) {
    console.error('Error saving published records:', error);
  }
  
  return { success: true, results };
}

module.exports = {
  testConnection,
  scanMarkdownFiles,
  publishMarkdownFiles
};
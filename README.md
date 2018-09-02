# Origami Markdown Documentation plugin
This is a simple yet powerful plugin for generating documentation from Markdown files in the fileystem on Origami.
It comes out of the box with a theme, however it integrates nicely with [origami-app-theme](https://github.com/origami-cms/app-theme) if you want to handle the rendering of the documents there.

## Installation

`yarn add origami-plugin-markdown-docs`

## Configuration

In your `.origami` file, add this to your `plugins`:

```JSON
{
    ...
    "plugins": {
        "markdown-docs": true
    }
    ...
}
```


## Options:

| Option | Type | Default | Description |
|-|-|-|-|
| `directory` | `string` | `'docs'` | Directory for the markdown files to read |
| `prefix` | `string` | `'/docs'` | URL prefix for serving the documentation |
| `themeTemplate` |  `string`, `false` | `false` | Pass the response data to [origami-app-theme](https://github.com/origami-cms/app-theme) to render  |
| `cssFile` |  `string` | `/docs/docs.css` | The path to the css file to include in each article |
| `cssHREF` |  `string` |  | Override the default css file with a custom stylesheet link |
| `sidebarSkipRoot` |  `boolean` | `true` | Don't include the root level folder in the sidebar |
| `logo` |  `string` | `true` | URL of the logo to display at the top of the sidebar |
| `siteTitle` |  `string` | `'Documentation'` | Title of the sidebar next to the logo |
| `cache` |  `boolean` | `true` | Enable caching (Recommended) |
| `colors` |  `object` | `false` | Key value pair for overriding colors |


### Example
```json
{
    ...
    "plugins": {
        "markdown-docs": {
            "directory": "./site/docs",
            "prefix": "docs/v1/",
            "logo": "/logo.svg",
            "siteTitle": "My docs",
            "colors": {
                "main": "red",
                "blue": "#0000ff"
            }
        }
    }
    ...
}


## Integration with `origami-app-theme`
In your `.origami` file, pass a template from your theme you want to render into `themeTemplate`:

```JSON
{
    ...
    "plugins": {
        "markdown-docs": {
            "themeTemplate": "documentation-article"
        }
    },
    "apps": {
        "theme": "my-theme"
    }
    ...
}
```

### Page template data
The theme template will be rendered with all the needed data on the response object.

| Option | Type | Description |
|-|-|-|
| `title` | `string` | The first heading on the page |
| `body` | `string` | The markdown rendered into a HTML string |
| `tree` | `object` | A recursive tree of the entire file structure supplied in the `directory` option|
| `css` | `string` | A URL to the css sheet |
| `headings` | `array` | An array of headings for the current article (useful for building table's of contents) |
| `url` | `string` | The current url (useful for matching active links, etc) |
| `sidebarSkipRoot` | `boolean` | See `sidebarSkipRoot` in the options |
| `logo` |  `string` | See `logo` in the options |
| `siteTitle` |  `string` | See `siteTitle` in the options |
| `colors` |  `object` | See `colors` in the options |


## Caching
By default, markdown-docs caches the rendered pages resulting in a much faster load time. To disable this, simply access a url with `?nocache` at the end of the url to rebuild that individual page


## Contributions

This project is maintained by the Origami Core team.

## Moving forward / TODO

- [] Add tests
- [] Customize theme colours/fonts, etc
- [] Implement searching with lunrjs

## Issues

If you find a bug, please file an issue on the issue tracker on GitHub.

## Credits

Full credits for this project go to the Origami Core team

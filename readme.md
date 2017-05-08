# bp

> create and use boilerplate

```sh
bp <name> <dir> [--create]
```

 - `name`: Name of the boilerplate file you are creating or using
 - `dir`: The directory you are creating from or scaffolding to

If `--create` is provided, it will create the boilerplate, otherwise it scaffolds.

## Installation

```sh
npm install --global jamen/bp
```

## Usage

Here is some examples

### Creating boilerplate

```
bp js js-boilerplate --create
```

`js-boilerplate` is a directory that contains any files + a `boilerplate.json`, which may contain:

```js
{
  "prompts": [
    { "name": "data_name",
      "type": "text",
      "message": "kek?" },
    // ...
  ]
}
```

### Using boilerplate

To scaffold just provide boilerplate file and destination:

```sh
bp js my-project
```

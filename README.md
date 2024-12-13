# Features

**LESS is MORE.**

This extension can configure scripts to help you simplify frequently used operations and develop some simple extension features. The main feature of this extension is:

* Pick to run your configured commands. (Needs to write your own `JavaScript`)

# Commands

* `pickcommand.executecommands`: Pick to run your configured commands.
* `pickcommand.writecommands`: Open directory which your commands should in.


# Settings

Put `js` files to specific directories `.vscode/pickcommand`. The `js` file must be a module by the following type.

```typescript
interface PickCommand {
    /**
	 * The function called to check whether the command should be shown or not.
	 * 
	 * Returns a `PickItem` or `string` to show the command, or `undefined` to hide it.
	 * 
	 * @param context parameter context @see PickContext
	 */
    pickitem?(context: PickContext): PickItem | string | undefined | Promise<PickItem | string | undefined>,

	/**
	 * The function called when you picked the command.
	 * @param context parameter context @see PickContext
	 */
    pickcommand(context: PickContext): any;
}
```

> More details for interface, visit [pickcommand.d.ts](docs/samples/pickcommand.d.ts)


## Using Typescript
This extension can not read `ts` files. But you can compile `ts` files to `js`.


# Feedback

[Provide feedback](https://github.com/rins-dev/vscode-pickcommand/issues) for questions, issues, or feature requests for the extension.

If you like this extension, you can [buy me a coffee](https://www.buymeacoffee.com/rins). Thanks.

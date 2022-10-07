# Features

**LESS is MORE.**

*The previous configuration has been modified.*

This extension can configure scripts to help you simplify frequently used operations and develop some simple extension features. The main feature of this extension is:

* Run configured `JavaScript`

![Sample](https://github.com/rins-dev/vscode-pickcommand/raw/main/images/pVQpSVIAkt.gif)

# Settings

Put `js` files to `pickcommand.directory`. The `js` file must be a module by the following type.

```typescript
type ValueType<T> =((...args: unknown[]) => T | Promise<T>);

interface PickCommand {
	init?: ValueType<void>;
	when?: ValueType<boolean>;
	label?: ValueType<string>;
	description?: ValueType<string | undefined>;
	detail?: ValueType<string | undefined>;
	order?: ValueType<number>;
    pickcommand: ValueType<any>;
}
```

# Using Typescript
This extension can not read `ts` files. But you can compile `ts` files to `js`.

1. 

# Troubleshooting

There is no troubleshooting yet.

If you have any questions or suggestions, please visit [Q & A](https://marketplace.visualstudio.com/items?itemName=rins.pickcommand&ssr=false#qna) to *Ask a question*, we will give feedback as soon as possible.

If you like this extension, you can [buy me a coffee](https://www.buymeacoffee.com/rins). Thanks.

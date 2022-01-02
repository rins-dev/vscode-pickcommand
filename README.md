# Features

This extension can configure scripts to help you simplify frequently used operations and develop some simple extension features. The main features of this extension are:

* Different operations can be performed in different states
* Configure a variety of functional commands
* Run configured `JavaScript`
* Run configured `ShellScript`
* Run configured `ShellScript` in `TERMINAL`

![Sample](https://github.com/rins-dev/vscode-pickcommand/raw/main/images/pVQpSVIAkt.gif)

This extension provides a basic configuration for Windows user (if you are a linux/mac user, you can also refer it to understand the basic functionality and can simply modify it to linux/mac style) to:

* Open the selected file with default application
* Compare the differences between two files or folders by external tool
* Call vscode command to transform selected text to capital
* Open configured files in vscode
* Run configured scripts in current terminal
* Pick configured host setting to ssh with a new terminal

Please copy the following configuration to your settings. If you don't need some commands, you can also comment them out in settings.

```json
{
    "pickcommand.constant": {
        "COMPARE_TOOL": "C:\\Program Files (x86)\\Beyond Compare 3\\BCompare.exe",
        "SHELL_PATH_BASH": "C:\\Program Files\\Git\\bin\\bash.exe"
    },
    "pickcommand.context": {
        "ACTIVE_EDITOR_SELECTED_TEXT": {
            "command": "pickcommand.runInJs",
            "script": [
                "let editor = vscode.window.activeTextEditor;",
                "return editor.selections.map(x => editor.document.getText(x.with())).join(' ');"
            ],
            "when": "{{vscode.window.activeTextEditor}}"
        },
        "CURRENT_Clipboard_TEXT": "{{vscode.env.clipboard.readText()}}"
    },
    "pickcommand.commands": {
        "Open selected file": {
            "command": "pickcommand.runInJs",
            "when": "{{context.SELECTED_FILE}}",
            "detail": "{{context.basename(context.SELECTED_FILE)}}",
            "script": "context.openExternal(context.SELECTED_FILE)",
            "priority": 101
        },
        "Compare selected files": {
            "command": "pickcommand.runInChildProcess",
            "when": "{{context.fileExists(context.COMPARE_TOOL) && context.SELECTED_FILES && context.SELECTED_FILES.length === 2}}",
            "detail": "{{context.basename(context.SELECTED_FILES[0])}} <-> {{context.basename(context.SELECTED_FILES[1])}}",
            "script": "START \"\" \"{{context.COMPARE_TOOL}}\" \"{{context.SELECTED_FILES[0].fsPath}}\" \"{{context.SELECTED_FILES[1].fsPath}}\"",
            "priority": 102
        },
        "Open User Settings(JSON)": {
            "command": "pickcommand.runInJs",
            "script": "vscode.commands.executeCommand('workbench.action.openSettingsJson')",
            "priority": 0
        },
        "Favorite Command Group": {
            "command":"pickcommand.showCommands",
            "commands": {
                "Call Favorite Command": {
                    "command": "pickcommand.runInJs",
                    "script": "vscode.commands.executeCommand(context.SELECTED_COMMAND.detail, ...context.CURRENT_ARGUMENTS)",
                    "context": {
                        "FAVORITE_COMMANDS": [
                            {
                                "label": "Transform to uppercase",
                                "detail": "editor.action.transformToUppercase"
                            },
                            {
                                "label": "Transform to lowercase",
                                "detail": "editor.action.transformToLowercase"
                            }
                        ],
                        "SELECTED_COMMAND": "{{context.showQuickPick(context.FAVORITE_COMMANDS)}}"
                    }
                },
                "Open Favorite File": {
                    "command":"pickcommand.runInJs",
                    "script": "context.openInternal(context.SELECTED_FILE.detail)",
                    "context": {
                        "FAVORITE_FILES": [
                            {
                                "label": "hosts",
                                "detail": "C:\\Windows\\System32\\drivers\\etc\\hosts"
                            },
                            {
                                "label": "hosts",
                                "detail": "/etc/hosts"
                            }
                        ],
                        "SELECTED_FILE": "{{context.showQuickPick(context.FAVORITE_FILES.filter(x => context.fileExists(x.detail)))}}"
                    }
                },
                "Execute Favorite Script": {
                    "command":"pickcommand.runInTerminal",
                    "script": "{{context.SELECTED_SCRIPT.detail}}",
                    "when": "{{vscode.window.activeTerminal}}",
                    "context": {
                        "FAVORITE_SCRIPTS": [
                            {
                                "label": "edit hosts",
                                "detail": "vi /etc/hosts"
                            }
                        ],
                        "SELECTED_SCRIPT": "{{context.showQuickPick(context.FAVORITE_SCRIPTS)}}"
                    }
                },
                "Create SSH Terminal": {
                    "command": "pickcommand.runInTerminal",
                    "script": "{{context.SELECTED_HOST.PASSWORD}}",
                    "context": {
                        "FAVORITE_HOSTS": [
                            {
                                "label": "FIRST_HOST",
                                "HOST": "192.168.0.1",
                                "USERNAME": "rins",
                                "PASSWORD": "thepassword",
                                "PORT": 22
                            },
                            {
                                "label": "SECOND_HOST",
                                "HOST": "192.168.0.2",
                                "USERNAME": "rins"
                            },
                        ],
                        "SELECTED_HOST": "{{context.showQuickPick(context.FAVORITE_HOSTS)}}",
                        "TERMINAL_OPTIONS": {
                            "name": "SSH {{context.SELECTED_HOST.label}}",
                            "shellPath": "{{context.SHELL_PATH_BASH}}",
                            "shellArgs": [
                                "-c",
                                "ssh {{context.SELECTED_HOST.USERNAME??'root'}}@{{context.SELECTED_HOST.HOST}} -p {{context.SELECTED_HOST.PORT??22}}"
                            ]
                        }
                    },
                    "terminal": "{{vscode.window.createTerminal(context.TERMINAL_OPTIONS)}}"
                }
            }
        }
    },
    "pickcommand.shortcut1": "Favorite Command Group"
}
```

Next we'll learn more about how to use this externsion and write your own configuration.

# Menus

The extension provides following context menu named `Pick all commands` or `Pick default command`. Details can be found in [contributes.menus](https://code.visualstudio.com/api/references/contribution-points#contributes.menus)

* The Explorer context menu - explorer/context
* The editor title context menu - editor/title/context
* SCM resources menus - scm/resourceState/context
* SCM resource folders menus - scm/resourceFolder/context

# Commands

This extension provides 3 types (12 in total) of VSCode commands to help you execute your configuration.

|Name|Description|
|---|---|
|PickAllCommand|This is the default action for the extension from the menu. Displays a list of all matching commands in the `pickcommand.commands` configuration. When you pick a command from the list, execute it.|
|PickDefaultCommand|Since PickAllCommand needs to pick every time, the extension provides a special entry that executes the first matching command directly when pressing **Alt** while opening the menu. It is useful when you know exactly the order of commands. <br>***The order of commands can be adjusted by configuration item named `priority`.***|
|ShortcutCommand|Since PickAllCommand needs to pick every time, the extension also provides 9 shortcut commands that can be used with key binding. Shortcut commands can be configured by `pickcommand.shortcut1-9`. However, because the shortcut command is not called by the menu and arguments cannot be passed, so you cannot use the context variables named `CURRENT_ARGUMENTS`, `SELECTED_FILE`, `SELECTED_FILES` in command configuration。|

# Settings

> Because this extension can execute `js` and `sh` scripts, please make sure that your configuration comes from a trusted provider.

This extension contributes the following settings:

|Name|Description|
|---|---|
|`pickcommand.constant`|Configure constant context variables used for all commands.|
|`pickcommand.context`|Configure context variables used for all commands.|
|`pickcommand.commands`|Configure all commands.|
|`pickcommand.shortcut[1-9]`|Configure shortcut commands. You need to specify the key in `pickcommand.commands`.|

## Context

Context variables that can be used in commands, will be reset while a command in `pickcommand.commands` is called. You can configure the variables and functions you want to use in command.

The following table lists the built-in contexts of this extension.

|Name|Type|Description|
|-------------------|---------------|-------|
|CURRENT_ARGUMENTS|any[]|When you execute command from the menu, the arguments passed by vscode are set.|
|SELECTED_FILE|vscode.Uri|When you execute command from the menu, Uri of the selected file is set.|
|SELECTED_FILES|vscode.Uri[]|When you execute command from the menu, Uris for the selected files are set.|

In addition, you can define other contexts you need in the `pickcommand.context` configuration or the `context` configuration of each [command object](#Command-object).

### The order for loading context

In some cases, variables defined in context will need to be referenced to functions or other variables defined in the same context. Because the loading order of the settings cannot be guaranteed, the extension is sorted by the key of the context and loaded with this order.

According to the habits of the producer, functions start with lowercase, variables are fully capitalized, so lowercases are read in alphabetical order before capitalization. However, for meaningful variable names, references between variables may still not be guaranteed, so give priority to _. The final sort order is `_0-9a-zA-Z`

This will also load the variable names that you need to guarantee the order, which you cannot determine, as defined as follows.

```none
_01_STEP,_02_STEP, function，VARIABLE，Z01_STEP，Z02_STEP...
```

> Note: Only the keys of the context are loaded in this order. There is no order for other keys, so other fields should remain stateless.

## Constant Context

Context is reset each time a command is called, and defining too many contexts can be a burden on the command's response. Constant context is a special kind of context that is reset only when the `pickcommand.constant` configuration has been modified and is typically used to hold constants, functions, and other data that does not need to be changed. When context is reset, the constant context will copy to context, so you can use the context as using the constant context.

The following table lists the built-in constant context.

|Name|Type|Description|
|-------------------|---------------|-------|
|CURRENT_PLATFORM|string|Get the platform for the current operating system. Specific values can be referenced by [process.platform](https://nodejs.org/dist/latest-v14.x/docs/api/process.html#process_process_platform)|
|log|`(x: any): void`|Prints log for debugging. When you activate the extension, you can view outputs on the PickCommand option in OUTPUT view.|
|cancel|`(message?: string): void`|Exits current command directly. It will showErrorMessage when message is set.|
|defined|`(x: any, message?: string): any`|When x is undefined, call `context.cancel(message)`. Otherwise, return x. |
|basename|`(uri: vscode.Uri\|string): string`|Returns the file name.|
|dirname|`(uri: vscode.Uri\|string): string`|Returns the directory name.|
|fileExists|`(uri: vscode.Uri\|string): boolean`|Checks whether the file exists.|
|filetype|`async (uri: vscode.Uri\|string): Promise<'DIRECTORY'\|'FILE'\|undefined>`|Returns file type.|
|asUri|`(uri: vscode.Uri\|string): vscode.Uri`|Returns Uri for a file path.|
|asPath|`(uri: vscode.Uri\|string): string`|Returns fsPath for the Uri.|
|showInputBox|`async (options?: vscode.InputBoxOptions): Promise<string>`|Same as `vscode.window.showInputBox`, but will auto call `context.cancel()` when `undefined`.|
|showQuickPick|`async (items: vscode.QuickPickItem[]\|string[], options?: vscode.QuickPickOptions): Promise<vscode.QuickPickItem\|string>`|Same as `vscode.window.showQuickPick`, but will auto call `context.cancel()` when `undefined`.|
|showTextDocument|`async (doc: vscode.TextDocument \| Promise<vscode.TextDocument>, language?: string): Promise<vscode.TextEditor>`|Show document with specific language.|
|openExternal|`async (uri: vscode.Uri\|string): Promise<boolean>`|Same as `vscode.env.openExternal`.|
|openInternal|`async (uri: vscode.Uri\|string, language?: string): Promise<vscode.TextEditor>`|Open file in vscode with specific language.|
|openTextEditor|`async (content: string, language?: string): Promise<vscode.TextEditor>`|Create untitled file in vscode with specific language.|

Custom constant context can be defined in the `pickcommand.constant` configuration.

> Note: Constant context is for performance reasons. If you don't focus on performance, you can also define functions in context instead of using constant context. When you try to write a new command configuration, you can define it as context and then move the required to constant.

> Tip: You can also save the value by defining an object in constant context and assigning a value to the members of the variable in the context by pickcommand.runInJs command.
> You can find the relevant examples in the description of [pickcommand.createCommand](#pickcommandcreateCommand).
> However, that the saved value will disappear after reloading vscode window, or after modifying the `pickcommand.constant` configuration.

## The configuration value

When you are writing configuration, you need to understand the special syntax with configuration values.

### Variable expressions

When you use strings in configuration values, you need to realize that when you configure strings that contain `{{` and `}}`, The content between will be replaced as a variable. When this string starts with `{{` and ends with `}}`, its value may not be a string, but the type of variable. If the variable type is a `Promise`, it will waits for the task complete and returns the value of `await`.

```jsonc
// Get text from the clipboard. The return type of vscode.env.clipboard.readText() is Promise<string>, so the CURRENT_CLIPBOARD_TEXT is a string type
"CURRENT_CLIPBOARD_TEXT": "{{vscode.env.clipboard.readText()}}",
```

> Tip: The extension doesn't provide escapes for `{{` or `}}`, you can use [pickcommand.runInJs](#pickcommandrunInJs) bacause it doesn't support variable expressions.

### Command object

When configured as an object and contains the `command` field, we call it **command object**. Command objects depends on the configured place, are divided into **Pickable command**, **Callable command** and **Direct command**.

* Pickable Command

    Command objects defined in `pickcommand.commands` configuration or in `commands` of `pickcommand.showCommands` will display a list of matching commands, and execute after user picks. The valid fields can be found in [PickCommandOptions](#PickCommandOptions) in [Built-in Command Interface](#Built-in-Command-Interface). Although pickable commands also have a return value, but usually don't need to notice.

* Callable command

    The command object defined in `value` of `pickcommand.createCommand`. The `pickcommand.createCommand` returns this command object, and you need to execute by explicitly calling its `execute` method. When a command needs to be used multiple times, I think you'll use it.

* Direct command

    Command objects configured outside of above configurations are direct command objects. When the configuration item is needed, direct command will execute directly and the return value will assign to the configuration item.

The following table lists the built-in commands for this extension. You can use them as command object.

|Built-in command|Description|
|----|---|
|[pickcommand.runInJs](#pickcommandrunInJs)|Run javascript and return the result of execution.|
|[pickcommand.runInTerminal](#pickcommandrunInTerminal)|Execute the script in terminal and return the terminal object.|
|[pickcommand.runInChildProcess](#pickcommandrunInChildProcess)|Execute the shell script, return the standard output of the script.|
|[pickcommand.showCommands](#pickcommandshowCommands)|Group commands, will show matching commands. When picking a command, this command will execute and returns the result of execution.|
|[pickcommand.createCommand](#pickcommandcreateCommand)|Similar to the usage of functions, returns the command object defined in value that can be explicitly called and repeatedly called are returned. Usually used only in context.|

You can also use any command provided by vscode. However, they generally do not have a return value and are usually used as pickable commands.

### Configuration items not calculated

In most cases, the configuration values calculated as described above. However, there are several items that will not be calculated. It will be clearly specified with ***Constant only*** in the introduction.

# Built-in Command Interface

There are many items have same usage when configuring command. When you encounter it in the next section, you can check it out here.

* ## CommandOptions

    All commands are inherited from this options, so you can use these configuration items in any command.

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |command|string|***Required.***|Specify the command that needs to be executed. It can be vscode's command or built-in command.***Constant only.***|
    |when|boolean|true|Whether the command can be executed. It will calculated before the `context` of this command, so you may not use the `context` defined in this command. If the `when` condition is not met, the command returns `underfined`.|
    |context|object||Define the context that this command needs to use. ***Constant only.***|

* ## PickCommandOptions

    PickCommandOptions are used in `pickcommand.commands` or `commands` of `pickcommand.showCommands`. CommandOptions will directly calculate `context` and other items after `when` is matched, But PickCommandOptions will calculate `label`, `description`, and `detail`, display the command list and wait for user pick, and then calculate the `context` and other items of the picked command.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |label|string|the key of pickable command|the label want to display|
    |description|string||the description want to display|
    |detail|string||the detail want to display|
    |priority|number|100|the sort order want to display in command list. ***Constant only.***<br>The big ones will come first. Less than 0 will not show in command list, but you still can used it as `pickcommand.shortcut[1-9]`. Because of not shown, `label`, `description` and `detail` will not be calculated.|

    > The `label`, `description` and `detail` are options of [vscode.QuickPickItem](https://code.visualstudio.com/api/references/vscode-api#QuickPickItem), you can refer it to learn how to add icon or other information.

* ## ScriptOptions

    For reasons where json string can't wrap lines, it would be ugly when the script is written more. The extension provides behavior that can be configured using string[].

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |script|null\|string\|string[]|Required|The script will be executed. When used as string[], will join with `\n`|

    ```jsonc
    "ACTIVE_EDITOR_SELECTED_TEXT": {
        "command":"pickcommand.runInJs",
        // Same as "script": "let editor = vscode.window.activeTextEditor;\\nreturn editor.selections.map(x => editor.document.getText(x.with()));"
        "script": [
            "let editor = vscode.window.activeTextEditor;",
            "return editor.selections.map(x => editor.document.getText(x.with()));"
        ]
    }
    ```

# Built-in Command

* ## pickcommand.runInJs

    This is a very powerful command. This command allows you to execute the configured javascript. You can use nodejs and vscode's API directly.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|
    |[ScriptOptions](#ScriptOptions)|Script options. You need to use return statement to return values. ***Constant only.*** The `script` in this command is all javascript, so does not need `{{` or `}}`to replace variables. |

> Although a longer script can implement the functionality of the extension, it is recommended that you use the context variables step-by-step processing for easy debugging and modification.

* ## pickcommand.runInTerminal

    This command allows you to execute configured shellscript in Terminal.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|
    |[ScriptOptions](#ScriptOptions)|Script options. You can use `{{` and `}}` to replace variables.|

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |terminal|[vscode.Terminal](https://code.visualstudio.com/api/references/vscode-api#Terminal)|`vscode.window.activeTerminal`|Terminal which this script execute in.|

* ## pickcommand.runInChildProcess

    Usually we execute shell commands and scripts in terminal. But with the script executed, we couldn't get its output, so we provided the runInChildProcess command. With this command, we can get the standard output of the shell. If this command has no standard output but only standard errors, the error will pop up.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|
    |[ScriptOptions](#ScriptOptions)|Script options. You can use `{{` and `}}` to replace variables.|
    |[ExecOptionsWithBufferEncoding](https://nodejs.org/dist/latest-v14.x/docs/api/child_process.html#child_process_child_process_exec_command_options_callback)|The `options` for calling `child_process.exec`. But `encoding` has been extended. For a complete list of encodings, please refer to the [Encoding API Encodings](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings) |

    > Note: When you need return output, you should make sure that your script will complete quickly.

* ## pickcommand.showCommands

    In some cases, you may need to group commands. ShowCommands can set up a set of commands. When showCommands executed, the command list pops up for selection. It's easier to use with shortcuts that can reduce one-time selection.

    The `when` and `context` in showCommands can be shared with its subcommands, so you can extract common conditions into showCommands. Make sure that then `when` condition in subcommand does not conflict with the condition in showCommands, otherwise the subcommand will never show.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |commands|{[key: string]: [PickCommandOptions](#PickCommandOptions)}||Subcommands. ***Constant only***|

* ## pickcommand.createCommand

    Typically, when a command execute, the commands in it will execute immediately. Sometimes, we want this command to be executed when it is called, just like call a function, and that's why createCommand comes on.
    CreateCommand is used to produce a command object that must be explicitly called its execute method to obtain the result of the command's execution.
    The execute method can pass arguments, and its return value is a Promise, which you need to use await to wait for it to return when explicitly called in runInJs.

    |Extend|Description|
    |-----------|------|
    |[CommandOptions](#CommandOptions)|Command options|

    |Name|Type|Default|Description|
    |----|----|-----|----|
    |value|[CommandOptions](#CommandOptions)||The command object that needs to be explicitly called. ***Constant only***|
    |args|string[]||The parameter names of execute. ***Constant only***|

    ---
    In the basic settings, we didn't use this command, To show how it works, here is a sample.

    1. Add a global constant object, then you can use it to save environment between different commands.

    ```jsonc
    "pickcommand.constant": {
        //...
        "DOCKER_ENV": {}
    }
    ```

    2. Add following command group to your commands settings.

    ```jsonc
    "pickcommand.commands": {
        //...
        "Docker Container": {
            "command":"pickcommand.showCommands",
            "commands": {
                "Show inspect": {
                    "command": "pickcommand.runInJs",
                    "script": "await context.openDoc(context.T_INSPECT_RESULT, 'json')",
                    "context": {
                        "SELECTED_CONTAINER": "{{context.showQuickPick(await context.getContainerList())}}",
                        "T_INSPECT_RESULT": {
                            "command":"pickcommand.runInChildProcess",
                            "script": "docker inspect {{context.SELECTED_CONTAINER.label}}"
                        }
                    }
                },
                "Start container": {
                    "command": "pickcommand.runInTerminal",
                    "script": "docker start {{context.SELECTED_CONTAINER.label}}",
                    "context": {
                        "SELECTED_CONTAINER": "{{context.showQuickPick(await context.getContainerList('status=exited'))}}",
                        "Z_FINAL_STEP:": "{{context.DOCKER_ENV.LAST_START_CONTAINER = context.SELECTED_CONTAINER.label}}"
                    }
                },
                "Stop container": {
                    "command": "pickcommand.runInTerminal",
                    "script": "docker stop {{context.SELECTED_CONTAINER.label}}",
                    "context": {
                        "SELECTED_CONTAINER": "{{context.showQuickPick(await context.getContainerList('status=running'))}}",
                        "Z_FINAL_STEP:": "{{delete context.DOCKER_ENV.LAST_START_CONTAINER}}"
                    }
                },
                "Run command": {
                    "command": "pickcommand.runInTerminal",
                    "script": "docker exec -it {{context.DOCKER_ENV.LAST_START_CONTAINER}} {{context.EXEC_COMMAND}}",
                    "when": "{{context.DOCKER_ENV.LAST_START_CONTAINER}}",
                    "context": {
                        "EXEC_COMMAND": "{{context.showInputBox({value: 'sh', prompt: `execute command in ${context.DOCKER_ENV.LAST_START_CONTAINER}`})}}"
                    }
                }
            },
            "context": {
                "_SHOW_CONTAINER_CMD": {
                    "command":"pickcommand.createCommand",
                    "value": {
                        "command":"pickcommand.runInChildProcess",
                        "script": {
                            "command":"pickcommand.runInJs",
                            "script": "return `docker ps -a --format \"{{.Names}}\\t{{.State}}\" ${args.FILTER??''}`"
                        }
                    },
                    "args": [ "FILTER" ]
                },
                "openDoc": "{{async (content, language) => vscode.window.showTextDocument(await vscode.workspace.openTextDocument({content, language}))}}",
                "getContainerList": {
                    "command":"pickcommand.runInJs",
                    "script": [
                        "return async(filter) => {",
                        "    let result = await context._SHOW_CONTAINER_CMD.execute(filter? `--filter \"${filter}\"`: '');",
                        "    return result.trim().split('\\n').map(x => {",
                        "        if (!x) context.cancel(`No container matches ${filter??''}.`);",
                        "        let [name, status] = x.split('\\t');",
                        "        return {label: name, description: status};",
                        "    });",
                        "};"
                    ]
                }
            }
        }
    ```

# Troubleshooting

There is no troubleshooting yet.

If you have any questions or suggestions, please visit [Q & A](https://marketplace.visualstudio.com/items?itemName=rins.pickcommand&ssr=false#qna) to *Ask a question*, we will give feedback as soon as possible.

If you like this extension, you can [buy me a coffee](https://www.buymeacoffee.com/rins). Thanks.

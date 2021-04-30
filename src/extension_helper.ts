
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { inspect, TextDecoder, promisify } from 'util';
import { CommandError } from './base/exception';
const exec = promisify(cp.exec);

export class ExtensionHelper {

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static EXTENSION_NAME = "pickcommand";
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static EXTENSION_DISPLAY_NAME = "PickCommand";

    static extensionContext: vscode.ExtensionContext;

    public static setContext(context: vscode.ExtensionContext) {
        ExtensionHelper.extensionContext = context;
    }

    public static appendExtensionName(value: string) {
        return `${ExtensionHelper.EXTENSION_NAME}.${value}`;
    }

    public static getConfiguration<T>(key: string, defaultValue: T): T {
        let config = vscode.workspace.getConfiguration(ExtensionHelper.EXTENSION_NAME);
        return config.get<T>(key, defaultValue);
    }

    public static registerConfigurationChangedEvent(listener: (e: vscode.ConfigurationChangeEvent) => unknown) {
        let disposable = vscode.workspace.onDidChangeConfiguration(listener);
        ExtensionHelper.extensionContext.subscriptions.push(disposable);
    }

    public static registerCommand(command: string, callback: (...args: unknown[]) => Thenable<unknown>) {

        let newCallback = async (...args: unknown[]) => {
            try {
                // ExtensionHelper.log(`Executing command(${command}): ${inspect(args)}`);
                let result = await callback(...args);
                ExtensionHelper.log(`Execute command [${command}] successful.`);
            } catch (err) {
                if (err instanceof CommandError && !err.message) {
                    ExtensionHelper.log(`Execute command [${command}] with CANCELLED`);
                } else {
                    vscode.window.showErrorMessage(err.message);
                    ExtensionHelper.log(`Execute command [${command}] with ERROR`, err);
                }
            }
        };
        let disposable = vscode.commands.registerCommand(command, newCallback);
        ExtensionHelper.extensionContext.subscriptions.push(disposable);
    }

    public static createTerminal(options: vscode.TerminalOptions) {
        let terminal = vscode.window.createTerminal(options);
        ExtensionHelper.extensionContext.subscriptions.push(terminal);
        return terminal;
    }

    private static _outputChannel: vscode.OutputChannel;
    private static initOutputChannel() {
        if (!ExtensionHelper._outputChannel) {
            ExtensionHelper._outputChannel = vscode.window.createOutputChannel(ExtensionHelper.EXTENSION_DISPLAY_NAME); 
            ExtensionHelper.extensionContext.subscriptions.push(ExtensionHelper._outputChannel);
        }
        return ExtensionHelper._outputChannel;
    }
    public static log(value: any, error?: Error) {
        ExtensionHelper.initOutputChannel();
        if (value) {
            if (typeof value === 'object') {
                ExtensionHelper._outputChannel.appendLine(inspect(value));
            } else {
                ExtensionHelper._outputChannel.appendLine(value);
            }
        }
        if (error) {
            if (error.stack) {
                ExtensionHelper._outputChannel.appendLine(error.stack);
            } else {
                ExtensionHelper._outputChannel.appendLine(`${error.name}: ${error.message}`);
            }
        }
    }

    public static trace(key: string, value: any) {
        ExtensionHelper.initOutputChannel();
        if (typeof value === 'object') {
            ExtensionHelper._outputChannel.appendLine(`${key} = ${inspect(value)}`);
        } else {
            ExtensionHelper._outputChannel.appendLine(`${key} = ${value}`);
        }
    }

    public static clone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    static splitBetween(str: string, start: string, end: string) {
        let startIndex = str.indexOf(start);
        if (startIndex < 0) {
            return str;
        }
        let endIndex = str.indexOf(end, startIndex + start.length);
        if (endIndex < 0) {
            return str;
        }
        return [
            str.slice(0, startIndex),
            str.slice(startIndex + start.length, endIndex),
            str.slice(endIndex + end.length)
        ];
    }

    static async exec(command: string, options?: cp.ExecOptionsWithBufferEncoding): Promise<{ stdout: string; stderr: string }> {
        let { stdout, stderr } = await exec(command, options);

        if (stdout instanceof Buffer) {
            stdout = new TextDecoder(options?.encoding??"utf-8").decode(stdout);
        }
        if (stderr instanceof Buffer) {
            stderr = new TextDecoder(options?.encoding??"utf-8").decode(stderr);
        }
        return { stdout, stderr };
    }
}
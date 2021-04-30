import * as vscode from 'vscode';
import { ExtensionHelper } from '../extension_helper';

export interface PickCommandOptions extends CommandOptions  {
    label: string;
    description?: string;
    detail?: string;
    priority?: number;
    
}

export interface CommandOptions {
    command: string;
    when?: boolean;
    context?: {[key: string]: unknown};
}

export interface ScriptOptions {
    script: string | string[];
}

export interface ScmResource {
    resourceUri: vscode.Uri;
}

export class OptionsHelper {
    
    static isCommandOptions(options: unknown): options is CommandOptions {
        if (options && typeof options === 'object') {
            if ((options as CommandOptions).command !== undefined) {
                return true;
            }
        }
        return false;
    }

    static isScriptOptions(options: unknown): options is ScriptOptions {
        if (options && typeof options === 'object') {
            if ((options as ScriptOptions).script !== undefined) {
                return true;
            }
        }
        return false;
    }

    static getScriptValue(options: ScriptOptions) {
        if (options.script instanceof Array) {
            return options.script.join('\n');
        } else {
            return options.script;
        }
    }

    static isScmResource(obj: unknown): obj is ScmResource {
        if (obj && typeof obj === 'object') {
            let o = obj as ScmResource;
            if (o.resourceUri instanceof vscode.Uri) {
                return true;
            }
        }
        return false;
    }
}
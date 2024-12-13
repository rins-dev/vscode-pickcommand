export type KeyType = string | number | symbol;

type KeyTypeOf<T, ValueType> = {
    [K in keyof T]: T[K] extends ValueType ? K : never
}[keyof T];


export type RFunction<TArgs extends any[] = [], TResult = void> = (...args: TArgs) => TResult;


export namespace Converter {
    
    export function arrayToObject<T, K extends KeyType, V = T>(array: T[], key: RFunction<[T], K>, value?: RFunction<[T], V>): Record<K, V>;
    export function arrayToObject<T, K extends KeyType, V = T>(array: T[], key: RFunction<[T], K>, value: KeyTypeOf<T, V>): Record<K, V>;
    export function arrayToObject<T, K extends KeyType, V = T>(array: T[], key: KeyTypeOf<T, K>, value?: RFunction<[T], V>): Record<K, V>;
    export function arrayToObject<T, K extends KeyType, V = T>(array: T[], key: KeyTypeOf<T, K>, value: KeyTypeOf<T, V>): Record<K, V>;
    export function arrayToObject<T, K extends KeyType, V = T>(array: T[], key: RFunction<[T], K> | KeyTypeOf<T, K>, value?: RFunction<[T], V> | KeyTypeOf<T, V>): Record<K, V> {
        let getKey: RFunction<[T], K>;
        if (typeof key === 'function') getKey = key;
        else getKey = (item) => item[key] as K;

        let getValue: RFunction<[T], V>;
        if (value === undefined) getValue = (item) => item as unknown as V;
        else if (typeof value === 'function') getValue = value;
        else getValue = (item) => item[value] as V;

        return array.reduce((p, c) => (p[getKey(c) as K] = getValue(c), p), {} as Record<K, V>);
    }
}
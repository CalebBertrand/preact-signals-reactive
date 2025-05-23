import { Signal, signal } from '@preact/signals';
import { Entry } from '../types/Entry';
import { assert } from './assert';
import { Filtered } from '../types/Filtered';
import { useMemo } from 'preact/hooks';
import { OmitByType } from '../types/OmitByType';

export type AtomicState = number | string | boolean | Date | Array<any> | undefined;

// have to use interface here to use recursive type
export interface ReactiveState {
    [key: string]: AtomicState | ReactiveState | Signal | Reactive | Function;
}

type InnerReactive<T extends ReactiveState> = {
    [K in keyof T]: T[K] extends AtomicState
        ? Signal<T[K]>
        : T[K] extends ReactiveState
          ? InnerReactive<T[K]>
          : Function;
};

export interface ShallowReactiveState {
    [key: string]: any; // since we don't have to worry about recursively creating reactives, no reason to restrict the values a shallow can store
}
type InnerShallowReactive<T extends ShallowReactiveState> = {
    [K in keyof T]: T[K] extends Function ? T[K] : Signal<T[K]>;
};

export type Reactive<T extends ReactiveState = any> = {
    [K in keyof T]: T[K] extends Signal<infer V>
        ? V
        : T[K] extends ReactiveState
          ? Reactive<T[K]>
          : T[K];
};
export type ShallowReactive<T extends ReactiveState = any> = {
    [K in keyof T]: T[K] extends Signal<infer V> ? V : T[K];
};

const valueTypes = ['undefined', 'string', 'number', 'boolean'];
function isValueType(
    value: unknown
): value is undefined | null | string | number | boolean | Array<any> | Date {
    return (
        value === null ||
        valueTypes.includes(typeof value) ||
        value instanceof Date ||
        value instanceof Array
    );
}

const reactiveHelpers = Symbol('reactiveHelpers');
export function isReactive(value: unknown): value is Reactive {
    return value && !!value[reactiveHelpers];
}

export const getRaw = <T extends ReactiveState>(x: Reactive<T>) =>
    (x[reactiveHelpers as any] as any).getRaw();
export const toSignal = <T extends ReactiveState, K extends keyof T>(x: Reactive<T>, key: K) =>
    (x[reactiveHelpers as any] as any).getUnderlyingSignal(key) as Signal<T[K]>;

const _reactive = <T extends ReactiveState>(initialState: T, shallow = false) => {
    let signalified: InnerReactive<T>;
    if (shallow) {
        signalified = Object.fromEntries(
            Object.entries(initialState).map(([key, value]: Entry<T>) => {
                if (value instanceof Function) {
                    return [key, value];
                }

                if (isValueType(value)) {
                    return [key, signal(value)];
                }

                if (value instanceof Signal) {
                    return [key, value];
                }

                if (isReactive(value)) {
                    return [key, signal(getRaw(value))];
                }

                return [key, signal(value)];
            })
        ) as InnerReactive<T>;
    } else {
        signalified = Object.fromEntries(
            Object.entries(initialState).map(([key, value]: Entry<T>) => {
                if (value instanceof Function) {
                    return [key, value];
                }

                if (isValueType(value)) {
                    return [key, signal(value)];
                }

                if (value instanceof Signal) {
                    return [key, value];
                }

                if (isReactive(value)) {
                    return [key, value];
                }

                return [key, _reactive(value)];
            })
        ) as InnerReactive<T>;
    }

    const proxied = new Proxy(signalified, {
        set(target, key, value) {
            if (typeof key === 'symbol') {
                return false;
            }

            assert(
                target[key],
                'You can only assign new values to existing properties in a reactive.'
            );
            const currentValue = target[key];

            if (currentValue instanceof Function) {
                throw new Error('Cannot reassign functions on reactives');
            }

            if (currentValue instanceof Signal) {
                currentValue.value = value;
                return true;
            }

            if (isReactive(value)) {
                throw new Error(
                    'Cannot assign new reactives to an existing reactive, just pass the raw object instead.'
                );
            }

            if (isReactive(currentValue)) {
                assert(
                    typeof value === 'object' && !isValueType(value),
                    'Can only assign objects to reactive properties.'
                );
                // Hypothetically this is the reactive state with the same shape as the sub reactive
                // But this method will be called inside it and throw if that's not the case
                Object.assign(currentValue, value);
                return true;
            }

            return false;
        },
        get(target, prop, _) {
            if (typeof prop === 'symbol') {
                if (prop === reactiveHelpers) {
                    return {
                        getRaw: () => {
                            const entries = Object.entries(target) as Array<Entry<typeof target>>;
                            const valueEntries = entries.filter(
                                ([_, value]) => !(value instanceof Function)
                            ) as Filtered<typeof entries, [string, Function]>;

                            // Extract the value from each signal / nested reactive
                            return Object.fromEntries(
                                valueEntries.map(([key, value]) => {
                                    if (isReactive(value)) {
                                        return [key, getRaw(value as Reactive<T>)];
                                    }

                                    return [key, (value as Signal).value];
                                })
                            );
                        },
                        getUnderlyingSignal: (key: keyof T) => {
                            assert(
                                typeof target[key] !== 'function',
                                'Cannot call toSignal on a function property.'
                            );
                            assert(
                                !isReactive(target[key]),
                                'Cannot call toSignal on a nested reactive'
                            );
                            return target[key];
                        }
                    };
                }

                return target[prop as any];
            }

            const value: Function | Reactive | Signal = target[prop];

            if (typeof value === 'function') {
                return value.bind(proxied);
            }

            if (value instanceof Signal) {
                return value.value;
            }

            return value;
        },

        // The two below methods are to ensure that the "value" prop is not enumerated by methods like the Object.entries or Object.keys
        ownKeys(target) {
            return Reflect.ownKeys(target).filter((key) => key !== 'value');
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop === 'value') {
                return undefined;
            }
            return Object.getOwnPropertyDescriptor(target, prop);
        }
    });

    return proxied as Reactive<T>;
};

export const reactive = <T extends ReactiveState>(initialState: T) =>
    _reactive(initialState) as Reactive<T>;
export const shallowReactive = <T extends ShallowReactiveState>(initialState: T) =>
    _reactive(initialState, true) as ShallowReactive<T>;

export const useReactive = <T extends ReactiveState>(initialValue: T) => {
    return useMemo(() => _reactive(initialValue), [initialValue]);
};
export const useShallowReactive = <T extends ShallowReactiveState>(initialValue: T) => {
    return useMemo(() => shallowReactive(initialValue), [initialValue]);
};
export const useToSignal = <T extends Reactive>(reactive: T, key: keyof T) =>
    useMemo(() => toSignal(reactive, key as any), [reactive, key]);

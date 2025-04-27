type ExpandedEntry<T> = T extends [infer K, infer V] ? (V extends any ? [K, V] : never) : never;

export type Entry<T extends object> = ExpandedEntry<
    {
        [K in keyof T]: K extends string ? [K, T[K]] : never;
    }[keyof T]
>;


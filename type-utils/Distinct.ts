export type Distinct<T, K> = T & { __KEY__: K }; // Allows you to create a type from a primitive, which is effectively the same but identifiable later

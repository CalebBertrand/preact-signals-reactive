# preact-signals-reactive

## Important: this isn't considered stable, I am using it in my personal projects and still working through an api I like.

Coming from Vue, I missed the convenience of putting a full state object into a `reactive` and using it as a sort of store. In Preact, this has been a bit more challenging since putting a full object of state into a signal will cause all relevant subscribers to re-render, even if only a small part of it is updated. This is basically a re-implementation of vue's reactive except, under the hood all state keys in the object are held in preact signals. This works recursively, but currently does not support changing shape over time (and I don't forsee needing that in the future for my use cases). Like the vue api, you can get the raw value of the state using a helper function, `getRaw`:
```
const state = useReactive({
  age: 35,
  name: 'John'
});

state.age = 36;

const user = getRaw(state);
// {
//   age: 36,
//   name: 'John'
// }
```
This also works with nested objects.

If you need to get the underlying signal for a given key, you can use `toSignal`:
```
const age$ = toSignal(state, 'age');
```

# 八、实现 useState Hook

[Hook](https://zh-hans.reactjs.org/docs/hooks-overview.html) 是 React 16.8 的新增特性。它可以让你在不编写 class 的情况下使用 state。

> 什么是 Hook

## 1.React 中的`useState`使用

```javascript
import React, { useState } from "react";
import ReactDOM from "react-dom";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}

const element = <App />;
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

## 2.在 Didact 中加入`useState`钩子

在创建`useState`函数之前，先声明一些全局变量，以便在`useSate`中使用。在`useState`中，首先要跟踪当前的 Fiber，所以需要一个当前 Fiber 的全局变量。其次需要一个 hook 数组，用来支持在同一组件中多次调用`useState`，也需要跟踪当前 hook 的索引。

```javascript
let wipFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
```

创建`useState`函数，当函数组件调用`useState`时，检查旧的 Fiber 中是否含有 hook。如果有旧的 hook，将旧的 hook 中的 state 复制到新的 hook 中，如果没有旧的 hook，将初始值复制到新的 hook。然后将新的 hook 赋值到当前 Fiber 中，hook 索引加一。

```javascript
function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initial,
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state];
}
```

`useState`应该也会返回一个函数用来设置 state 的值，所以还需要定义一个`setState`函数。此外，将更新操作的函数推到一个队列中，在`useState`中依次从队列中取值更新到 state。当 state 更新时，需要重新渲染组件。这里只需要将下次渲染的单元，设置成当前单元即可。

```javascript
function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action instanceof Function ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
```

```javascript
const Didact = {
  createElement,
  render,
  useState,
};
```

## 3.验证是否有效

```javascript
/** @jsx Didact.createElement */
function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>你点击了 {count} 次</p>
      <button onClick={() => setCount(count + 1)}>点击一下</button>
    </div>
  );
}

const element = <App />;
const container = document.getElementById("root");
Didact.render(element, container);
```

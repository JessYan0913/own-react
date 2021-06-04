# 四、优化`render`逻辑

## 1.存在的问题

在[《三、组件渲染》]()中实现了从组件到渲染的逻辑`Didact.render`，但是这里的`render`逻辑存在一些问题。

在`render`中使用了递归调用的方式渲染 DOM，当`render`一旦开始，直到整个 DOM 渲染完成才会停止。如果需要渲染很大的 DOM 树，`render`就会长时间占用主线程。在此期间浏览器无法处理其他主线程逻辑，这是不应该的。

解决上述问题的思路有两个：

- 将`render`任务拆分成一个个小单元来执行。完成一个小单元后，让出主线程就可以。
- 也是将`render`任务拆分成小单元。不同的是，在浏览器主线程空闲时执行渲染逻辑。

React 采用了第二种解决思路，也就是 React 是在主线程空闲时执行 DOM 渲染逻辑。

## 2.问题解决

使用[window.requestIdleCallback(callback[, options])](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)函数，实现在浏览器空闲时执行代码。

> `window.requestIdleCallback(callback[, options])`方法将在浏览器的空闲时段内调用排队的回调函数。这使开发这能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。函数一般会按先进先调用的顺序执行。

`requestIdleCallback`可以理解为`setTimeOut`，和`setTimeOut`不同的是`requestIdleCallback`并不是我们告诉它，何时执行。而是在主线程空闲时会执行这里的回调函数。

> 在新版本的 React 中废弃了`requestIdleCallback`机制，改用了 [scheduler](https://github.com/facebook/react/tree/master/packages/scheduler) 的方式。不过在这里使用的效果与`requestIdleCallback`相同。<br>`scheduler`是一个 Facebook 开发的调度包。

在代码中添加`requestIdleCallback`：

```javascript
let nextUnitOfWork = null;

/**
 * requestIdleCallback的回调函数
 **/
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 执行完成后，再次调用requestIdleCallback进行下一轮渲染
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(nextUnitOfWork) {
  // TODO: 处理每个小单元的渲染任务，并返回下一个要渲染的单元
}
```

## 3.实现小单元渲染

为了组织渲染数据结构，定义一个`Fiber`的结构树。假设需要渲染如下 DOM 结构：

```html
<div>
  <h1>
    <p />
    <a />
  </h1>
  <h2></h2>
</div>
```

对应的`Fiber`树会是这样：

![StepFiberTree](https://github.com/JessYan0913/own-react/blob/master/src/assets/step4-fibertree.png)

`Fiber`树的每个节点都是一个 DOM 元素，当渲染完一个节点后，如果该节点存在子节点，那该子节点就是下一个要渲染的元素。

例如：渲染完 `<div>` 后，下一个要渲染的是 `<h1>`。

如果当前渲染的节点，没有子节点。那么它的兄弟节点就是下一个要渲染的节点。

例如：渲染完 `<p>` 后，由于 `<p>` 没有子节点，那么下一个要渲染的是 `<a>`。

如果当前渲染的节点，没有子节点，也没有要渲染的兄弟节点。那么它的叔叔节点就是下一个要渲染的节点。

例如：渲染完 `<a>` 后，由于 `<a>` 没有子节点，也没有要渲染的兄弟节点，那么下一个要渲染的是 `<h2>`。

`Fiber`的数据的关键结构如下：

```javascript
var fiber = {
  type: "div",
  parent: "root",
  child: {
    type: "h1",
    parent: "div",
    child: {
      type: "p",
      parent: "h1",
      child: null,
      sibling: {
        type: "a",
        parent: "h1",
        child: null,
        sibling: null,
      },
    },
    sibling: {
      type: "h2",
      parent: "div",
      child: null,
      sibling: null,
    },
  },
  sibling: null,
};
```

实现前面的`performUnitOfWork`函数：

```javascript
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber.dom);
  }

  if (fiber.parent) {
    // 将DOM挂载到父DOM上
    fiber.parent.dom.appendChild(fiber.dom);
  }

  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;
  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}
```

实现根据 element 创建 DOM 节点：

```javascript
function createDom(fiber) {
  const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}
```

做好渲染准备后，在`render`函数中初始化渲染单元：

```javascript
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
}
```

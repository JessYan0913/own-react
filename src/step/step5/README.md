# 五、提交 Fiber 树

为什么选择了`Fiber`而不是`DIFF`算法？可以参考大神的另外一篇文章[《Fibre-递增对比》](https://github.com/chinanf-boy/didact-explain/blob/master/5.Fibre.readme.md#51-%E4%B8%BA%E4%BB%80%E4%B9%88%E9%80%89%E6%8B%A9fiber)。

## 1.存在问题

在[《四、优化`render`逻辑》](https://github.com/JessYan0913/own-react/tree/master/src/step/step4)中，将渲染 DOM 的工作拆分成了小单元。并利用浏览器空闲时间渲染，但是如果每次渲染完一个小单元后，浏览器中断了渲染逻辑，将展示出不完整的画面。

如果整个`Fiber`创建完成后，一次性渲染 DOM，就避免了这个问题的出现。

## 2.Fiber 更新时不挂载 DOM

在`performUnitOfWork`中，只完成`Fiber`的 DOM 生成操作。移除其中的 DOM 挂载：

```javascript
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber.dom);
  }

  // 在performUnitOfWork中只做fiber更新
  // if (fiber.parent) {
  //   // 将DOM挂载到父DOM上
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }

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

## 3.提交 Fiber 树

当 Fiber 树全部生成后，一次性挂载到 DOM 上。创建`commitRoot`方法，提交 Fiber 树，并实现挂载：

```javascript
let wipRoot = null;

function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

在`render`方法中，需要初始化`wipRoot`变量：

```javascript
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = wipRoot;
}
```

在`workLoop`中，当`Fiber`树处理完后，进行一次性提交挂载：

```javascript
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}
```

# 六、DOM 更新和删除

Didact 目前只能完成【新增】元素的操作，还缺少【更新】和【删除】元素的能力。也就是每次都是创建新的 DOM 进行操作。

## 1.实现新增/更新/删除元素

在`perfrmUnitOfWork`中去掉关于 Fiber 的创建操作：

```javascript
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  // let index = 0;
  // let prevSibling = null;
  // while (index < elements.length) {
  //   const element = elements[index];

  //   const newFiber = {
  //     type: element.type,
  //     props: element.props,
  //     parent: fiber,
  //     dom: null,
  //   };

  //   if (index === 0) {
  //     fiber.child = newFiber;
  //   } else {
  //     prevSibling.sibling = newFiber;
  //   }

  //   prevSibling = newFiber;
  //   index++;
  // }

  ...
}
```

创建`reconcileChildren`函数，处理 Fiber 的新增/更新/删除：

```javascript
function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  let index = 0;

  // TODO: oldFiber 有可能是 null 也有可能是 undefined 所以这里只能用 != 。不能用 !==
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    // TODO: 对比当前处理的Fiber和旧的Fiber，并处理

    prevSibling = newFiber;
    index++;
  }
}
```

在`performUnitOfWork`中应用`reconcileChildren`函数处理 Fiber 的变更：

```javascript
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

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

## 2.处理 Fiber 树变更

需要对比当前的 Fiber 树和旧的 Fiber 树之间差异，按照如下逻辑判断：

- 当前 Fiber 和旧的 Fiber 如果存在标签相同的元素，那么将当前 Fiber 属性覆盖旧的 Fiber。
- 如果标签不相同，当前 Fiber 中存在该标签，那么在 Fiber 中增加新标签。
- 如果标签不相同，当前 Fiber 中不存在该标签，旧的 Fiber 中存在，那么删除该标签。

```javascript
let deletions = null;

function reconcileChildren(wipFiber, elements) {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  let index = 0;

  // TODO: oldFiber 有可能是 null 也有可能是 undefined 所以这里只能用 != 。不能用 !==
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    const sameType = oldFiber && element && element.type === oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}
```

## 3.Fiber 提交变更

由于 Fiber 增加了新增/更新/删除操作，在提交时也应该对这些 DOM 进行相对应操作：

首先，从 DOM 中删除已经不存在的标签，然后在处理其他操作。

```javascript
let currentRoot = null;

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;

  const domParent = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    // TODO: 更新DOM属性
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

更新 DOM 属性时除了考虑属性值的变更外，还需要考虑添加在标签上的监听事件的变更。在 React 中监听事件以`on`开头。

```javascript
const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((key) => {
      const eventType = key.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[key]);
    });

  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((key) => {
      dom[key] = "";
    });

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((key) => {
      dom[key] = nextProps[key];
    });

  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((key) => {
      const eventType = key.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[key]);
    });
}
```

在`commitWork`中更新时变更的 DOM 属性：

```javascript
function commitWork(fiber) {
  if (!fiber) return;

  const domParent = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

在创建新的 DOM 时也需要添加响应的属性和监听方法：

```javascript
function createDom(fiber) {
  const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}
```

## 4.检验属性变更是否生效

在`render`中初始化`deletions`和`currentRoot`:

```javascript
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}
```

```javascript
/** @jsx Didact.createElement */
const container = document.getElementById("root");

const updateValue = (e) => {
  rerender(e.target.value);
};

const rerender = (value) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
      {value.length % 2 === 0 ? <p>偶数长度</p> : <h3>奇数长度</h3>}
    </div>
  );
  Didact.render(element, container);
};

rerender("World");
```

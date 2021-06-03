/** @jsxRuntime classic */

/**
 * 创建元素的方法应该存在如下输入和输出功能
 * @param {*} type
 * @param {*} props
 * @param  {...any} children
 * @returns
 */
 function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // 子节点也可以是原始类型，例如字符串和数字
      children: children.map((child) => (typeof child === "object" ? child : createTextElement(child))),
    },
  };
}

/**
 * 数据结构应该与createElement一致，因为createTextElement只是createElement的特例
 * @param {*} text
 * @returns
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/**
 * 根据fiber渲染dom，将原来render里的代码转移到这里
 * @param {*} fiber
 */
function createDom(fiber) {
  // 根据element的type创建一个新的节点，如果是字符节点，创建textNode
  const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}

const isEvent = (key) => key.startsWith("on"); // 判断是否是监听事件
const isProperty = (key) => key !== "children" && !isEvent(key); // 判断是否时属性
const isNew = (prev, next) => (type) => prev[type] !== next[type]; // 判断是否是新属性，或者值变更的属性
const isGone = (prev, next) => (type) => !(type in next); // 判断是否是已删除属性
function updateDom(dom, prevProps, nextProps) {
  // 删除旧的 或者 已经变化的监听事件
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      // 将onClick 转换成 click
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 删除旧的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  // 添加新属性，或更新属性值
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // 添加新的监听事件
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

/**
 * 当完成全部的fiber更新，再一次提交给DOM
 */
function commitRoot() {
  // 循环处理要删除的元素
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    // 对应普通组件的移除
    domParent.removeChild(fiber.dom);
  } else {
    // 对应函数组件的移除
    commitDeletion(fiber.child, domParent);
  }
}

/**
 *  渲染
 * @param {*} element
 * @param {*} container
 */
function render(element, container) {
  // 设置nextUnitOfWork为根节点，根节点的dom为要挂载的容器
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = []; // 每次渲染前都重置删除元素集合
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let currentRoot = null; // 当前渲染完的fiber结构
let wipRoot = null;
let deletions = null; // 记录需要删除的元素

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // deadline.timeRemaining() 当前主线程闲置周期的预估剩余毫秒数
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    // 当不再有要操作工作包 并且存在完整的wipRoot时，提交得DOM
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

/**
 * requestIdleCallback参考MDN
 * https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback
 *
 * 当浏览器空闲时，调用 workLoop 开始渲染DOM
 */
requestIdleCallback(workLoop);

/**
 *
 * react支持函数插件，函数插件跟之前不同的地方有：
 * 1， 函数插件没有DOM节点
 * 2， 子节点来自运行该函数，而不是直接来自props
 *
 * 处理一个小单元的渲染，并返回下一个要处理的单元包
 *
 * @param {*} nextUnitOfWork
 * @return
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    // 如果是函数式组件，采用函数式更新，运行这个函数得到需要的子节点
    updateFunctionComponent(fiber);
  } else {
    // 如果不是函数式组件，还是采用之前的更新方法
    updateHostComponent(fiber);
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

/**
 *
 * 需要在调用函数式组件之前，初始化一些全局变量，方便在函数式组件中使用
 *
 */
let wipFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  // fiber.type式一个函数 运行函数式组件中的函数，并传值
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(initial) {
  // 检查是否存在旧钩子
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  // 如果存在旧钩子，赋值旧钩子的state到新钩子，否则使用初始值设置。
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  // 按顺序执行钩子队列中的更新操作
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  // useState应该还返回一个函数，用来设置state
  const setState = (action) => {
    // 将更新state的操作推进钩子队列中
    hook.queue.push(action);
    // 当state变化时，重新渲染组件，因此这里重置了与render函数相类似的数据
    // 将新的根节点，设置为下次更新节点。当循环开始时，就会刷新state内容
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  // 将新钩子添加到 fiber 的hooks中，钩子索引+1
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}

/**
 * 再这里对比新Fiber 和 旧Fiber
 * @param {*} wipFiber
 * @param {*} elements
 */
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  // 获取正在处理的 fiber 中alternate的子节点
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  // oldFiber 有可能是 null 也有可能是 undefined 所以这里只能用 != 。不能用 !==
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    // 对比 新Fiber 和 旧Fiber 的类型是否一致
    const sameType = oldFiber && element && element.type === oldFiber.type;

    if (sameType) {
      // 如果类型相同，则进行更新操作
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
      // 如果存在新的元素，并且类型不同，则进行新增操作
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
      // 如果旧fiber存在，类型不同，则进行删除操作
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

const Didact = {
  createElement,
  render,
  useState,
};

/** @jsx Didact.createElement */
/**
 * react的函数组件有钩子机制，辅助完成组件功能，常用的钩子：useState
 */
function App(props) {
  const [state, setState] = Didact.useState(1);
  return <h1 onClick={() => setState((i) => i + 1)}>Count {state}</h1>;
}
const element = <App name="foo" />;
console.log(element);
const container = document.getElementById("root");
Didact.render(element, container);

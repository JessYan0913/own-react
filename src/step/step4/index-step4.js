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
 function render(element, container) {
    // 根据element的type创建一个新的节点，如果是字符节点，创建textNode
    const dom = element.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(element.type);

    // 将属性分配到创建的dom上，除了props中的children属性
    const isProperty = (key) => key !== "children";
    Object.keys(element.props)
      .filter(isProperty)
      .forEach((name) => {
        dom[name] = element.props[name];
      });

    // 递归的创建element的子节点
    element.props.children.forEach((child) => {
      render(child, dom);
    });

    // 将创建的节点添加到容器中
    container.appendChild(dom);
  } 
 * 
 * 这里的递归调用是存在问题的，当render一旦开始，直到渲染完整个element才会停止。
 * 如果element很大，这个render会长时间占用主线程。在render期间浏览器无法处理其他的事，这是不应该出现的。
 * 要解决这个问题，需要将render拆分成小单元。完成一个小单元后，让出主线程就可以。
 *  
 * 实现element挂载到container
 * @param {*} element
 * @param {*} container
 */
function render(element, container) {
  // 根据element的type创建一个新的节点，如果是字符节点，创建textNode
  const dom = element.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(element.type);

  // 将属性分配到创建的dom上，除了props中的children属性
  const isProperty = (key) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  // 递归的创建element的子节点
  element.props.children.forEach((child) => {
    render(child, dom);
  });

  // 将创建的节点添加到容器中
  container.appendChild(dom);
}

let nextUnitOfWork = null;

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // deadline.timeRemaining() 当前主线程闲置周期的预估剩余毫秒数
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

/**
 * requestIdleCallback参考MDN
 * https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback
 *
 * window.requestIdleCallback()方法将在浏览器的空闲时段内调用的函数排队。
 * 这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。
 * 函数一般会按先进先调用的顺序执行。
 * 
 * requestIdleCallback 可以理解为 setTimeOut，与setTimeOut不同的是requestIdleCallback并不是
 * 我们告诉它何时执行，而是主线程空闲时会执行这里的回调函数。
 * 老版本的React使用的requestIdleCallback机制，新版的废弃了这种调度方式，改用scheduler，不过在这里
 * 效果是相同的。
 * 
 * scheduler参考github
 * https://github.com/facebook/react/tree/master/packages/scheduler
 */
requestIdleCallback(workLoop);

/**
 * 处理一个小单元的渲染，并返回下一个要处理的单元包
 * @param {*} nextUnitOfWork
 * @return
 */
function performUnitOfWork(nextUnitOfWork) {
  // TODO：处理小单元的渲染，并返回下一个要处理的单元
}

const Didact = {
  createElement,
  render,
};

/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);
const container = document.getElementById("root");
/**
  ReactDOM.render(element, container);
 * ReactDOM.render并不能识别Didact.createElement返回的结构，需要实现Didact自己的render方法
 */
Didact.render(element, container);

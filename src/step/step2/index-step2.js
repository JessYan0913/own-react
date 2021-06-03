// import React from "react";

// const element = React.createElement(
//   "div",
//   {
//     id: "foo",
//   },
//   React.createElement("h1", null, "Hello"),
//   React.createElement("b", null, null)
// );

// console.log(element);

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => (typeof child === "object" ? child : createTextElement(child))),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

const Didact = {
  createElement,
};

const element = Didact.createElement(
  "div",
  {
    id: "foo",
  },
  Didact.createElement("h1", null, "Hello"),
  Didact.createElement("b", null, null)
);

console.log(element);

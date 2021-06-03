import React from "react";
import ReactDOM from "react-dom";

/**
    const element = (
      <div id="foo">
        <h1>Hello</h1>
        <b />
      </div>
    );
 * 将 jsx的element改用React.createElement方法实现如下
 */
const element = React.createElement(
  "div",
  {
    id: "foo",
  },
  React.createElement("h1", null, "Hello"),
  React.createElement("b", null, null)
);
const container = document.getElementById("root");
ReactDOM.render(element, container);

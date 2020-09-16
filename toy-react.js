const RENDER_TO_DOM = Symbol("render to dom");

class ElementWrapper {
    constructor(type){
        this.root = document.createElement(type);
    }
    setAttribute(name, value){
        if(name.match(/^on([\s\S]+)$/)){
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
        } else {
            this.root.setAttribute(name, value);
        }
    }
    appendChild(component){
        let range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        component[RENDER_TO_DOM](range);
    }
    [RENDER_TO_DOM](range){
        range.deleteContents();
        range.insertNode(this.root);
    }
}

class TextWrapper {
    constructor(content){
        this.root = document.createTextNode(content);
    }
    [RENDER_TO_DOM](range){
        range.deleteContents();
        range.insertNode(this.root);
    }
}

export class Component {
    constructor(){
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
        this._range = null;
    }
    setAttribute(name, value){
        this.props[name] = value;
    }
    appendChild(Component){
        this.children.push(Component);
    } 
    [RENDER_TO_DOM](range){
        this._range = range;
        this.render()[RENDER_TO_DOM](range);
    }
    //重新绘制算法
    rerender(){
        this._range.deleteContents();
        this[RENDER_TO_DOM](this._range);
    }
    setState(newState){
        if(this.state === null || typeof this.state !== "object"){
            this.state = newState;
            this.rerender();
            return;
        }
        let merge = (oldState, newState) => {
            for(let p in newState) {
                if(oldState[p] === null || typeof oldState[p] !== "object"){
                    oldState[p] = newState[p];
                } else{
                    merge(oldState[p], newState[p]);
                }
            }
        }
        merge(this.state, newState);
        this.rerender();
    }
}

export function createElement(type, attributes, ...children){
    var e;
    //jsx 如果组件名为小写则识别为原生组件如div，webpack后会自动加引号，而如果是自定义的组件名为大写如MyComponent则不会加引号，我们认为是一个Class
    if(typeof type === "string"){
        e = new ElementWrapper(type);
    } else{
        //如果是自定义的class无法直接调用document.createElement,因此需要自己进行封装
        e = new type;
    }
  
    //let e = document.createElement(tagName);
    for (let p in attributes){
      e.setAttribute(p, attributes[p]);
    }
    let insertChildren = (children) =>{
        for(let child of children) {
            if(typeof child === "string"){
              child = new TextWrapper(child);
            }
            if(typeof child === "object" && child instanceof Array){
                insertChildren(child);
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children);
    
    return e;
  }
  
export function render(component, parentElement){
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}  
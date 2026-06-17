(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();function Ng(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var Lg={exports:{}},ac={},Ig={exports:{}},Ke={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ha=Symbol.for("react.element"),Q_=Symbol.for("react.portal"),ex=Symbol.for("react.fragment"),tx=Symbol.for("react.strict_mode"),nx=Symbol.for("react.profiler"),ix=Symbol.for("react.provider"),rx=Symbol.for("react.context"),sx=Symbol.for("react.forward_ref"),ox=Symbol.for("react.suspense"),ax=Symbol.for("react.memo"),lx=Symbol.for("react.lazy"),vh=Symbol.iterator;function cx(n){return n===null||typeof n!="object"?null:(n=vh&&n[vh]||n["@@iterator"],typeof n=="function"?n:null)}var Dg={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Ug=Object.assign,Fg={};function to(n,e,t){this.props=n,this.context=e,this.refs=Fg,this.updater=t||Dg}to.prototype.isReactComponent={};to.prototype.setState=function(n,e){if(typeof n!="object"&&typeof n!="function"&&n!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,n,e,"setState")};to.prototype.forceUpdate=function(n){this.updater.enqueueForceUpdate(this,n,"forceUpdate")};function Og(){}Og.prototype=to.prototype;function ef(n,e,t){this.props=n,this.context=e,this.refs=Fg,this.updater=t||Dg}var tf=ef.prototype=new Og;tf.constructor=ef;Ug(tf,to.prototype);tf.isPureReactComponent=!0;var _h=Array.isArray,kg=Object.prototype.hasOwnProperty,nf={current:null},zg={key:!0,ref:!0,__self:!0,__source:!0};function Bg(n,e,t){var i,r={},s=null,o=null;if(e!=null)for(i in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(s=""+e.key),e)kg.call(e,i)&&!zg.hasOwnProperty(i)&&(r[i]=e[i]);var a=arguments.length-2;if(a===1)r.children=t;else if(1<a){for(var l=Array(a),c=0;c<a;c++)l[c]=arguments[c+2];r.children=l}if(n&&n.defaultProps)for(i in a=n.defaultProps,a)r[i]===void 0&&(r[i]=a[i]);return{$$typeof:ha,type:n,key:s,ref:o,props:r,_owner:nf.current}}function ux(n,e){return{$$typeof:ha,type:n.type,key:e,ref:n.ref,props:n.props,_owner:n._owner}}function rf(n){return typeof n=="object"&&n!==null&&n.$$typeof===ha}function dx(n){var e={"=":"=0",":":"=2"};return"$"+n.replace(/[=:]/g,function(t){return e[t]})}var xh=/\/+/g;function Ic(n,e){return typeof n=="object"&&n!==null&&n.key!=null?dx(""+n.key):e.toString(36)}function cl(n,e,t,i,r){var s=typeof n;(s==="undefined"||s==="boolean")&&(n=null);var o=!1;if(n===null)o=!0;else switch(s){case"string":case"number":o=!0;break;case"object":switch(n.$$typeof){case ha:case Q_:o=!0}}if(o)return o=n,r=r(o),n=i===""?"."+Ic(o,0):i,_h(r)?(t="",n!=null&&(t=n.replace(xh,"$&/")+"/"),cl(r,e,t,"",function(c){return c})):r!=null&&(rf(r)&&(r=ux(r,t+(!r.key||o&&o.key===r.key?"":(""+r.key).replace(xh,"$&/")+"/")+n)),e.push(r)),1;if(o=0,i=i===""?".":i+":",_h(n))for(var a=0;a<n.length;a++){s=n[a];var l=i+Ic(s,a);o+=cl(s,e,t,l,r)}else if(l=cx(n),typeof l=="function")for(n=l.call(n),a=0;!(s=n.next()).done;)s=s.value,l=i+Ic(s,a++),o+=cl(s,e,t,l,r);else if(s==="object")throw e=String(n),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(n).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function Sa(n,e,t){if(n==null)return n;var i=[],r=0;return cl(n,i,"","",function(s){return e.call(t,s,r++)}),i}function fx(n){if(n._status===-1){var e=n._result;e=e(),e.then(function(t){(n._status===0||n._status===-1)&&(n._status=1,n._result=t)},function(t){(n._status===0||n._status===-1)&&(n._status=2,n._result=t)}),n._status===-1&&(n._status=0,n._result=e)}if(n._status===1)return n._result.default;throw n._result}var on={current:null},ul={transition:null},hx={ReactCurrentDispatcher:on,ReactCurrentBatchConfig:ul,ReactCurrentOwner:nf};function Vg(){throw Error("act(...) is not supported in production builds of React.")}Ke.Children={map:Sa,forEach:function(n,e,t){Sa(n,function(){e.apply(this,arguments)},t)},count:function(n){var e=0;return Sa(n,function(){e++}),e},toArray:function(n){return Sa(n,function(e){return e})||[]},only:function(n){if(!rf(n))throw Error("React.Children.only expected to receive a single React element child.");return n}};Ke.Component=to;Ke.Fragment=ex;Ke.Profiler=nx;Ke.PureComponent=ef;Ke.StrictMode=tx;Ke.Suspense=ox;Ke.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=hx;Ke.act=Vg;Ke.cloneElement=function(n,e,t){if(n==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+n+".");var i=Ug({},n.props),r=n.key,s=n.ref,o=n._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,o=nf.current),e.key!==void 0&&(r=""+e.key),n.type&&n.type.defaultProps)var a=n.type.defaultProps;for(l in e)kg.call(e,l)&&!zg.hasOwnProperty(l)&&(i[l]=e[l]===void 0&&a!==void 0?a[l]:e[l])}var l=arguments.length-2;if(l===1)i.children=t;else if(1<l){a=Array(l);for(var c=0;c<l;c++)a[c]=arguments[c+2];i.children=a}return{$$typeof:ha,type:n.type,key:r,ref:s,props:i,_owner:o}};Ke.createContext=function(n){return n={$$typeof:rx,_currentValue:n,_currentValue2:n,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},n.Provider={$$typeof:ix,_context:n},n.Consumer=n};Ke.createElement=Bg;Ke.createFactory=function(n){var e=Bg.bind(null,n);return e.type=n,e};Ke.createRef=function(){return{current:null}};Ke.forwardRef=function(n){return{$$typeof:sx,render:n}};Ke.isValidElement=rf;Ke.lazy=function(n){return{$$typeof:lx,_payload:{_status:-1,_result:n},_init:fx}};Ke.memo=function(n,e){return{$$typeof:ax,type:n,compare:e===void 0?null:e}};Ke.startTransition=function(n){var e=ul.transition;ul.transition={};try{n()}finally{ul.transition=e}};Ke.unstable_act=Vg;Ke.useCallback=function(n,e){return on.current.useCallback(n,e)};Ke.useContext=function(n){return on.current.useContext(n)};Ke.useDebugValue=function(){};Ke.useDeferredValue=function(n){return on.current.useDeferredValue(n)};Ke.useEffect=function(n,e){return on.current.useEffect(n,e)};Ke.useId=function(){return on.current.useId()};Ke.useImperativeHandle=function(n,e,t){return on.current.useImperativeHandle(n,e,t)};Ke.useInsertionEffect=function(n,e){return on.current.useInsertionEffect(n,e)};Ke.useLayoutEffect=function(n,e){return on.current.useLayoutEffect(n,e)};Ke.useMemo=function(n,e){return on.current.useMemo(n,e)};Ke.useReducer=function(n,e,t){return on.current.useReducer(n,e,t)};Ke.useRef=function(n){return on.current.useRef(n)};Ke.useState=function(n){return on.current.useState(n)};Ke.useSyncExternalStore=function(n,e,t){return on.current.useSyncExternalStore(n,e,t)};Ke.useTransition=function(){return on.current.useTransition()};Ke.version="18.3.1";Ig.exports=Ke;var te=Ig.exports;const px=Ng(te);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mx=te,gx=Symbol.for("react.element"),vx=Symbol.for("react.fragment"),_x=Object.prototype.hasOwnProperty,xx=mx.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,yx={key:!0,ref:!0,__self:!0,__source:!0};function Hg(n,e,t){var i,r={},s=null,o=null;t!==void 0&&(s=""+t),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(o=e.ref);for(i in e)_x.call(e,i)&&!yx.hasOwnProperty(i)&&(r[i]=e[i]);if(n&&n.defaultProps)for(i in e=n.defaultProps,e)r[i]===void 0&&(r[i]=e[i]);return{$$typeof:gx,type:n,key:s,ref:o,props:r,_owner:xx.current}}ac.Fragment=vx;ac.jsx=Hg;ac.jsxs=Hg;Lg.exports=ac;var x=Lg.exports,Gg={exports:{}},An={},jg={exports:{}},Wg={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(n){function e(P,k){var z=P.length;P.push(k);e:for(;0<z;){var H=z-1>>>1,X=P[H];if(0<r(X,k))P[H]=k,P[z]=X,z=H;else break e}}function t(P){return P.length===0?null:P[0]}function i(P){if(P.length===0)return null;var k=P[0],z=P.pop();if(z!==k){P[0]=z;e:for(var H=0,X=P.length,ue=X>>>1;H<ue;){var U=2*(H+1)-1,ee=P[U],ie=U+1,re=P[ie];if(0>r(ee,z))ie<X&&0>r(re,ee)?(P[H]=re,P[ie]=z,H=ie):(P[H]=ee,P[U]=z,H=U);else if(ie<X&&0>r(re,z))P[H]=re,P[ie]=z,H=ie;else break e}}return k}function r(P,k){var z=P.sortIndex-k.sortIndex;return z!==0?z:P.id-k.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;n.unstable_now=function(){return s.now()}}else{var o=Date,a=o.now();n.unstable_now=function(){return o.now()-a}}var l=[],c=[],d=1,f=null,h=3,p=!1,g=!1,y=!1,m=typeof setTimeout=="function"?setTimeout:null,u=typeof clearTimeout=="function"?clearTimeout:null,_=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function v(P){for(var k=t(c);k!==null;){if(k.callback===null)i(c);else if(k.startTime<=P)i(c),k.sortIndex=k.expirationTime,e(l,k);else break;k=t(c)}}function M(P){if(y=!1,v(P),!g)if(t(l)!==null)g=!0,J(A);else{var k=t(c);k!==null&&Z(M,k.startTime-P)}}function A(P,k){g=!1,y&&(y=!1,u(N),N=-1),p=!0;var z=h;try{for(v(k),f=t(l);f!==null&&(!(f.expirationTime>k)||P&&!D());){var H=f.callback;if(typeof H=="function"){f.callback=null,h=f.priorityLevel;var X=H(f.expirationTime<=k);k=n.unstable_now(),typeof X=="function"?f.callback=X:f===t(l)&&i(l),v(k)}else i(l);f=t(l)}if(f!==null)var ue=!0;else{var U=t(c);U!==null&&Z(M,U.startTime-k),ue=!1}return ue}finally{f=null,h=z,p=!1}}var b=!1,T=null,N=-1,w=5,S=-1;function D(){return!(n.unstable_now()-S<w)}function V(){if(T!==null){var P=n.unstable_now();S=P;var k=!0;try{k=T(!0,P)}finally{k?I():(b=!1,T=null)}}else b=!1}var I;if(typeof _=="function")I=function(){_(V)};else if(typeof MessageChannel<"u"){var G=new MessageChannel,B=G.port2;G.port1.onmessage=V,I=function(){B.postMessage(null)}}else I=function(){m(V,0)};function J(P){T=P,b||(b=!0,I())}function Z(P,k){N=m(function(){P(n.unstable_now())},k)}n.unstable_IdlePriority=5,n.unstable_ImmediatePriority=1,n.unstable_LowPriority=4,n.unstable_NormalPriority=3,n.unstable_Profiling=null,n.unstable_UserBlockingPriority=2,n.unstable_cancelCallback=function(P){P.callback=null},n.unstable_continueExecution=function(){g||p||(g=!0,J(A))},n.unstable_forceFrameRate=function(P){0>P||125<P?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):w=0<P?Math.floor(1e3/P):5},n.unstable_getCurrentPriorityLevel=function(){return h},n.unstable_getFirstCallbackNode=function(){return t(l)},n.unstable_next=function(P){switch(h){case 1:case 2:case 3:var k=3;break;default:k=h}var z=h;h=k;try{return P()}finally{h=z}},n.unstable_pauseExecution=function(){},n.unstable_requestPaint=function(){},n.unstable_runWithPriority=function(P,k){switch(P){case 1:case 2:case 3:case 4:case 5:break;default:P=3}var z=h;h=P;try{return k()}finally{h=z}},n.unstable_scheduleCallback=function(P,k,z){var H=n.unstable_now();switch(typeof z=="object"&&z!==null?(z=z.delay,z=typeof z=="number"&&0<z?H+z:H):z=H,P){case 1:var X=-1;break;case 2:X=250;break;case 5:X=1073741823;break;case 4:X=1e4;break;default:X=5e3}return X=z+X,P={id:d++,callback:k,priorityLevel:P,startTime:z,expirationTime:X,sortIndex:-1},z>H?(P.sortIndex=z,e(c,P),t(l)===null&&P===t(c)&&(y?(u(N),N=-1):y=!0,Z(M,z-H))):(P.sortIndex=X,e(l,P),g||p||(g=!0,J(A))),P},n.unstable_shouldYield=D,n.unstable_wrapCallback=function(P){var k=h;return function(){var z=h;h=k;try{return P.apply(this,arguments)}finally{h=z}}}})(Wg);jg.exports=Wg;var Mx=jg.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Sx=te,Tn=Mx;function le(n){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+n,t=1;t<arguments.length;t++)e+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+n+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Xg=new Set,Xo={};function Gr(n,e){Bs(n,e),Bs(n+"Capture",e)}function Bs(n,e){for(Xo[n]=e,n=0;n<e.length;n++)Xg.add(e[n])}var Ci=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Qu=Object.prototype.hasOwnProperty,Ex=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,yh={},Mh={};function wx(n){return Qu.call(Mh,n)?!0:Qu.call(yh,n)?!1:Ex.test(n)?Mh[n]=!0:(yh[n]=!0,!1)}function Tx(n,e,t,i){if(t!==null&&t.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return i?!1:t!==null?!t.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function Ax(n,e,t,i){if(e===null||typeof e>"u"||Tx(n,e,t,i))return!0;if(i)return!1;if(t!==null)switch(t.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function an(n,e,t,i,r,s,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=i,this.attributeNamespace=r,this.mustUseProperty=t,this.propertyName=n,this.type=e,this.sanitizeURL=s,this.removeEmptyString=o}var Gt={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){Gt[n]=new an(n,0,!1,n,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var e=n[0];Gt[e]=new an(e,1,!1,n[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(n){Gt[n]=new an(n,2,!1,n.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){Gt[n]=new an(n,2,!1,n,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){Gt[n]=new an(n,3,!1,n.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(n){Gt[n]=new an(n,3,!0,n,null,!1,!1)});["capture","download"].forEach(function(n){Gt[n]=new an(n,4,!1,n,null,!1,!1)});["cols","rows","size","span"].forEach(function(n){Gt[n]=new an(n,6,!1,n,null,!1,!1)});["rowSpan","start"].forEach(function(n){Gt[n]=new an(n,5,!1,n.toLowerCase(),null,!1,!1)});var sf=/[\-:]([a-z])/g;function of(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var e=n.replace(sf,of);Gt[e]=new an(e,1,!1,n,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var e=n.replace(sf,of);Gt[e]=new an(e,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(n){var e=n.replace(sf,of);Gt[e]=new an(e,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(n){Gt[n]=new an(n,1,!1,n.toLowerCase(),null,!1,!1)});Gt.xlinkHref=new an("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(n){Gt[n]=new an(n,1,!1,n.toLowerCase(),null,!0,!0)});function af(n,e,t,i){var r=Gt.hasOwnProperty(e)?Gt[e]:null;(r!==null?r.type!==0:i||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(Ax(e,t,r,i)&&(t=null),i||r===null?wx(e)&&(t===null?n.removeAttribute(e):n.setAttribute(e,""+t)):r.mustUseProperty?n[r.propertyName]=t===null?r.type===3?!1:"":t:(e=r.attributeName,i=r.attributeNamespace,t===null?n.removeAttribute(e):(r=r.type,t=r===3||r===4&&t===!0?"":""+t,i?n.setAttributeNS(i,e,t):n.setAttribute(e,t))))}var Li=Sx.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ea=Symbol.for("react.element"),gs=Symbol.for("react.portal"),vs=Symbol.for("react.fragment"),lf=Symbol.for("react.strict_mode"),ed=Symbol.for("react.profiler"),$g=Symbol.for("react.provider"),Yg=Symbol.for("react.context"),cf=Symbol.for("react.forward_ref"),td=Symbol.for("react.suspense"),nd=Symbol.for("react.suspense_list"),uf=Symbol.for("react.memo"),ji=Symbol.for("react.lazy"),qg=Symbol.for("react.offscreen"),Sh=Symbol.iterator;function uo(n){return n===null||typeof n!="object"?null:(n=Sh&&n[Sh]||n["@@iterator"],typeof n=="function"?n:null)}var _t=Object.assign,Dc;function bo(n){if(Dc===void 0)try{throw Error()}catch(t){var e=t.stack.trim().match(/\n( *(at )?)/);Dc=e&&e[1]||""}return`
`+Dc+n}var Uc=!1;function Fc(n,e){if(!n||Uc)return"";Uc=!0;var t=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var i=c}Reflect.construct(n,[],e)}else{try{e.call()}catch(c){i=c}n.call(e.prototype)}else{try{throw Error()}catch(c){i=c}n()}}catch(c){if(c&&i&&typeof c.stack=="string"){for(var r=c.stack.split(`
`),s=i.stack.split(`
`),o=r.length-1,a=s.length-1;1<=o&&0<=a&&r[o]!==s[a];)a--;for(;1<=o&&0<=a;o--,a--)if(r[o]!==s[a]){if(o!==1||a!==1)do if(o--,a--,0>a||r[o]!==s[a]){var l=`
`+r[o].replace(" at new "," at ");return n.displayName&&l.includes("<anonymous>")&&(l=l.replace("<anonymous>",n.displayName)),l}while(1<=o&&0<=a);break}}}finally{Uc=!1,Error.prepareStackTrace=t}return(n=n?n.displayName||n.name:"")?bo(n):""}function bx(n){switch(n.tag){case 5:return bo(n.type);case 16:return bo("Lazy");case 13:return bo("Suspense");case 19:return bo("SuspenseList");case 0:case 2:case 15:return n=Fc(n.type,!1),n;case 11:return n=Fc(n.type.render,!1),n;case 1:return n=Fc(n.type,!0),n;default:return""}}function id(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case vs:return"Fragment";case gs:return"Portal";case ed:return"Profiler";case lf:return"StrictMode";case td:return"Suspense";case nd:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case Yg:return(n.displayName||"Context")+".Consumer";case $g:return(n._context.displayName||"Context")+".Provider";case cf:var e=n.render;return n=n.displayName,n||(n=e.displayName||e.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case uf:return e=n.displayName||null,e!==null?e:id(n.type)||"Memo";case ji:e=n._payload,n=n._init;try{return id(n(e))}catch{}}return null}function Cx(n){var e=n.type;switch(n.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=e.render,n=n.displayName||n.name||"",e.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return id(e);case 8:return e===lf?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function dr(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Kg(n){var e=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function Rx(n){var e=Kg(n)?"checked":"value",t=Object.getOwnPropertyDescriptor(n.constructor.prototype,e),i=""+n[e];if(!n.hasOwnProperty(e)&&typeof t<"u"&&typeof t.get=="function"&&typeof t.set=="function"){var r=t.get,s=t.set;return Object.defineProperty(n,e,{configurable:!0,get:function(){return r.call(this)},set:function(o){i=""+o,s.call(this,o)}}),Object.defineProperty(n,e,{enumerable:t.enumerable}),{getValue:function(){return i},setValue:function(o){i=""+o},stopTracking:function(){n._valueTracker=null,delete n[e]}}}}function wa(n){n._valueTracker||(n._valueTracker=Rx(n))}function Zg(n){if(!n)return!1;var e=n._valueTracker;if(!e)return!0;var t=e.getValue(),i="";return n&&(i=Kg(n)?n.checked?"true":"false":n.value),n=i,n!==t?(e.setValue(n),!0):!1}function wl(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function rd(n,e){var t=e.checked;return _t({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:t??n._wrapperState.initialChecked})}function Eh(n,e){var t=e.defaultValue==null?"":e.defaultValue,i=e.checked!=null?e.checked:e.defaultChecked;t=dr(e.value!=null?e.value:t),n._wrapperState={initialChecked:i,initialValue:t,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function Jg(n,e){e=e.checked,e!=null&&af(n,"checked",e,!1)}function sd(n,e){Jg(n,e);var t=dr(e.value),i=e.type;if(t!=null)i==="number"?(t===0&&n.value===""||n.value!=t)&&(n.value=""+t):n.value!==""+t&&(n.value=""+t);else if(i==="submit"||i==="reset"){n.removeAttribute("value");return}e.hasOwnProperty("value")?od(n,e.type,t):e.hasOwnProperty("defaultValue")&&od(n,e.type,dr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(n.defaultChecked=!!e.defaultChecked)}function wh(n,e,t){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var i=e.type;if(!(i!=="submit"&&i!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+n._wrapperState.initialValue,t||e===n.value||(n.value=e),n.defaultValue=e}t=n.name,t!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,t!==""&&(n.name=t)}function od(n,e,t){(e!=="number"||wl(n.ownerDocument)!==n)&&(t==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+t&&(n.defaultValue=""+t))}var Co=Array.isArray;function Ps(n,e,t,i){if(n=n.options,e){e={};for(var r=0;r<t.length;r++)e["$"+t[r]]=!0;for(t=0;t<n.length;t++)r=e.hasOwnProperty("$"+n[t].value),n[t].selected!==r&&(n[t].selected=r),r&&i&&(n[t].defaultSelected=!0)}else{for(t=""+dr(t),e=null,r=0;r<n.length;r++){if(n[r].value===t){n[r].selected=!0,i&&(n[r].defaultSelected=!0);return}e!==null||n[r].disabled||(e=n[r])}e!==null&&(e.selected=!0)}}function ad(n,e){if(e.dangerouslySetInnerHTML!=null)throw Error(le(91));return _t({},e,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Th(n,e){var t=e.value;if(t==null){if(t=e.children,e=e.defaultValue,t!=null){if(e!=null)throw Error(le(92));if(Co(t)){if(1<t.length)throw Error(le(93));t=t[0]}e=t}e==null&&(e=""),t=e}n._wrapperState={initialValue:dr(t)}}function Qg(n,e){var t=dr(e.value),i=dr(e.defaultValue);t!=null&&(t=""+t,t!==n.value&&(n.value=t),e.defaultValue==null&&n.defaultValue!==t&&(n.defaultValue=t)),i!=null&&(n.defaultValue=""+i)}function Ah(n){var e=n.textContent;e===n._wrapperState.initialValue&&e!==""&&e!==null&&(n.value=e)}function e0(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function ld(n,e){return n==null||n==="http://www.w3.org/1999/xhtml"?e0(e):n==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var Ta,t0=function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,t,i,r){MSApp.execUnsafeLocalFunction(function(){return n(e,t,i,r)})}:n}(function(n,e){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=e;else{for(Ta=Ta||document.createElement("div"),Ta.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=Ta.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;e.firstChild;)n.appendChild(e.firstChild)}});function $o(n,e){if(e){var t=n.firstChild;if(t&&t===n.lastChild&&t.nodeType===3){t.nodeValue=e;return}}n.textContent=e}var Do={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Px=["Webkit","ms","Moz","O"];Object.keys(Do).forEach(function(n){Px.forEach(function(e){e=e+n.charAt(0).toUpperCase()+n.substring(1),Do[e]=Do[n]})});function n0(n,e,t){return e==null||typeof e=="boolean"||e===""?"":t||typeof e!="number"||e===0||Do.hasOwnProperty(n)&&Do[n]?(""+e).trim():e+"px"}function i0(n,e){n=n.style;for(var t in e)if(e.hasOwnProperty(t)){var i=t.indexOf("--")===0,r=n0(t,e[t],i);t==="float"&&(t="cssFloat"),i?n.setProperty(t,r):n[t]=r}}var Nx=_t({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function cd(n,e){if(e){if(Nx[n]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(le(137,n));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(le(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(le(61))}if(e.style!=null&&typeof e.style!="object")throw Error(le(62))}}function ud(n,e){if(n.indexOf("-")===-1)return typeof e.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var dd=null;function df(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var fd=null,Ns=null,Ls=null;function bh(n){if(n=ga(n)){if(typeof fd!="function")throw Error(le(280));var e=n.stateNode;e&&(e=fc(e),fd(n.stateNode,n.type,e))}}function r0(n){Ns?Ls?Ls.push(n):Ls=[n]:Ns=n}function s0(){if(Ns){var n=Ns,e=Ls;if(Ls=Ns=null,bh(n),e)for(n=0;n<e.length;n++)bh(e[n])}}function o0(n,e){return n(e)}function a0(){}var Oc=!1;function l0(n,e,t){if(Oc)return n(e,t);Oc=!0;try{return o0(n,e,t)}finally{Oc=!1,(Ns!==null||Ls!==null)&&(a0(),s0())}}function Yo(n,e){var t=n.stateNode;if(t===null)return null;var i=fc(t);if(i===null)return null;t=i[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(n=n.type,i=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!i;break e;default:n=!1}if(n)return null;if(t&&typeof t!="function")throw Error(le(231,e,typeof t));return t}var hd=!1;if(Ci)try{var fo={};Object.defineProperty(fo,"passive",{get:function(){hd=!0}}),window.addEventListener("test",fo,fo),window.removeEventListener("test",fo,fo)}catch{hd=!1}function Lx(n,e,t,i,r,s,o,a,l){var c=Array.prototype.slice.call(arguments,3);try{e.apply(t,c)}catch(d){this.onError(d)}}var Uo=!1,Tl=null,Al=!1,pd=null,Ix={onError:function(n){Uo=!0,Tl=n}};function Dx(n,e,t,i,r,s,o,a,l){Uo=!1,Tl=null,Lx.apply(Ix,arguments)}function Ux(n,e,t,i,r,s,o,a,l){if(Dx.apply(this,arguments),Uo){if(Uo){var c=Tl;Uo=!1,Tl=null}else throw Error(le(198));Al||(Al=!0,pd=c)}}function jr(n){var e=n,t=n;if(n.alternate)for(;e.return;)e=e.return;else{n=e;do e=n,e.flags&4098&&(t=e.return),n=e.return;while(n)}return e.tag===3?t:null}function c0(n){if(n.tag===13){var e=n.memoizedState;if(e===null&&(n=n.alternate,n!==null&&(e=n.memoizedState)),e!==null)return e.dehydrated}return null}function Ch(n){if(jr(n)!==n)throw Error(le(188))}function Fx(n){var e=n.alternate;if(!e){if(e=jr(n),e===null)throw Error(le(188));return e!==n?null:n}for(var t=n,i=e;;){var r=t.return;if(r===null)break;var s=r.alternate;if(s===null){if(i=r.return,i!==null){t=i;continue}break}if(r.child===s.child){for(s=r.child;s;){if(s===t)return Ch(r),n;if(s===i)return Ch(r),e;s=s.sibling}throw Error(le(188))}if(t.return!==i.return)t=r,i=s;else{for(var o=!1,a=r.child;a;){if(a===t){o=!0,t=r,i=s;break}if(a===i){o=!0,i=r,t=s;break}a=a.sibling}if(!o){for(a=s.child;a;){if(a===t){o=!0,t=s,i=r;break}if(a===i){o=!0,i=s,t=r;break}a=a.sibling}if(!o)throw Error(le(189))}}if(t.alternate!==i)throw Error(le(190))}if(t.tag!==3)throw Error(le(188));return t.stateNode.current===t?n:e}function u0(n){return n=Fx(n),n!==null?d0(n):null}function d0(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var e=d0(n);if(e!==null)return e;n=n.sibling}return null}var f0=Tn.unstable_scheduleCallback,Rh=Tn.unstable_cancelCallback,Ox=Tn.unstable_shouldYield,kx=Tn.unstable_requestPaint,St=Tn.unstable_now,zx=Tn.unstable_getCurrentPriorityLevel,ff=Tn.unstable_ImmediatePriority,h0=Tn.unstable_UserBlockingPriority,bl=Tn.unstable_NormalPriority,Bx=Tn.unstable_LowPriority,p0=Tn.unstable_IdlePriority,lc=null,li=null;function Vx(n){if(li&&typeof li.onCommitFiberRoot=="function")try{li.onCommitFiberRoot(lc,n,void 0,(n.current.flags&128)===128)}catch{}}var Jn=Math.clz32?Math.clz32:jx,Hx=Math.log,Gx=Math.LN2;function jx(n){return n>>>=0,n===0?32:31-(Hx(n)/Gx|0)|0}var Aa=64,ba=4194304;function Ro(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Cl(n,e){var t=n.pendingLanes;if(t===0)return 0;var i=0,r=n.suspendedLanes,s=n.pingedLanes,o=t&268435455;if(o!==0){var a=o&~r;a!==0?i=Ro(a):(s&=o,s!==0&&(i=Ro(s)))}else o=t&~r,o!==0?i=Ro(o):s!==0&&(i=Ro(s));if(i===0)return 0;if(e!==0&&e!==i&&!(e&r)&&(r=i&-i,s=e&-e,r>=s||r===16&&(s&4194240)!==0))return e;if(i&4&&(i|=t&16),e=n.entangledLanes,e!==0)for(n=n.entanglements,e&=i;0<e;)t=31-Jn(e),r=1<<t,i|=n[t],e&=~r;return i}function Wx(n,e){switch(n){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Xx(n,e){for(var t=n.suspendedLanes,i=n.pingedLanes,r=n.expirationTimes,s=n.pendingLanes;0<s;){var o=31-Jn(s),a=1<<o,l=r[o];l===-1?(!(a&t)||a&i)&&(r[o]=Wx(a,e)):l<=e&&(n.expiredLanes|=a),s&=~a}}function md(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function m0(){var n=Aa;return Aa<<=1,!(Aa&4194240)&&(Aa=64),n}function kc(n){for(var e=[],t=0;31>t;t++)e.push(n);return e}function pa(n,e,t){n.pendingLanes|=e,e!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,e=31-Jn(e),n[e]=t}function $x(n,e){var t=n.pendingLanes&~e;n.pendingLanes=e,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=e,n.mutableReadLanes&=e,n.entangledLanes&=e,e=n.entanglements;var i=n.eventTimes;for(n=n.expirationTimes;0<t;){var r=31-Jn(t),s=1<<r;e[r]=0,i[r]=-1,n[r]=-1,t&=~s}}function hf(n,e){var t=n.entangledLanes|=e;for(n=n.entanglements;t;){var i=31-Jn(t),r=1<<i;r&e|n[i]&e&&(n[i]|=e),t&=~r}}var ot=0;function g0(n){return n&=-n,1<n?4<n?n&268435455?16:536870912:4:1}var v0,pf,_0,x0,y0,gd=!1,Ca=[],er=null,tr=null,nr=null,qo=new Map,Ko=new Map,$i=[],Yx="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Ph(n,e){switch(n){case"focusin":case"focusout":er=null;break;case"dragenter":case"dragleave":tr=null;break;case"mouseover":case"mouseout":nr=null;break;case"pointerover":case"pointerout":qo.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":Ko.delete(e.pointerId)}}function ho(n,e,t,i,r,s){return n===null||n.nativeEvent!==s?(n={blockedOn:e,domEventName:t,eventSystemFlags:i,nativeEvent:s,targetContainers:[r]},e!==null&&(e=ga(e),e!==null&&pf(e)),n):(n.eventSystemFlags|=i,e=n.targetContainers,r!==null&&e.indexOf(r)===-1&&e.push(r),n)}function qx(n,e,t,i,r){switch(e){case"focusin":return er=ho(er,n,e,t,i,r),!0;case"dragenter":return tr=ho(tr,n,e,t,i,r),!0;case"mouseover":return nr=ho(nr,n,e,t,i,r),!0;case"pointerover":var s=r.pointerId;return qo.set(s,ho(qo.get(s)||null,n,e,t,i,r)),!0;case"gotpointercapture":return s=r.pointerId,Ko.set(s,ho(Ko.get(s)||null,n,e,t,i,r)),!0}return!1}function M0(n){var e=Ir(n.target);if(e!==null){var t=jr(e);if(t!==null){if(e=t.tag,e===13){if(e=c0(t),e!==null){n.blockedOn=e,y0(n.priority,function(){_0(t)});return}}else if(e===3&&t.stateNode.current.memoizedState.isDehydrated){n.blockedOn=t.tag===3?t.stateNode.containerInfo:null;return}}}n.blockedOn=null}function dl(n){if(n.blockedOn!==null)return!1;for(var e=n.targetContainers;0<e.length;){var t=vd(n.domEventName,n.eventSystemFlags,e[0],n.nativeEvent);if(t===null){t=n.nativeEvent;var i=new t.constructor(t.type,t);dd=i,t.target.dispatchEvent(i),dd=null}else return e=ga(t),e!==null&&pf(e),n.blockedOn=t,!1;e.shift()}return!0}function Nh(n,e,t){dl(n)&&t.delete(e)}function Kx(){gd=!1,er!==null&&dl(er)&&(er=null),tr!==null&&dl(tr)&&(tr=null),nr!==null&&dl(nr)&&(nr=null),qo.forEach(Nh),Ko.forEach(Nh)}function po(n,e){n.blockedOn===e&&(n.blockedOn=null,gd||(gd=!0,Tn.unstable_scheduleCallback(Tn.unstable_NormalPriority,Kx)))}function Zo(n){function e(r){return po(r,n)}if(0<Ca.length){po(Ca[0],n);for(var t=1;t<Ca.length;t++){var i=Ca[t];i.blockedOn===n&&(i.blockedOn=null)}}for(er!==null&&po(er,n),tr!==null&&po(tr,n),nr!==null&&po(nr,n),qo.forEach(e),Ko.forEach(e),t=0;t<$i.length;t++)i=$i[t],i.blockedOn===n&&(i.blockedOn=null);for(;0<$i.length&&(t=$i[0],t.blockedOn===null);)M0(t),t.blockedOn===null&&$i.shift()}var Is=Li.ReactCurrentBatchConfig,Rl=!0;function Zx(n,e,t,i){var r=ot,s=Is.transition;Is.transition=null;try{ot=1,mf(n,e,t,i)}finally{ot=r,Is.transition=s}}function Jx(n,e,t,i){var r=ot,s=Is.transition;Is.transition=null;try{ot=4,mf(n,e,t,i)}finally{ot=r,Is.transition=s}}function mf(n,e,t,i){if(Rl){var r=vd(n,e,t,i);if(r===null)Yc(n,e,i,Pl,t),Ph(n,i);else if(qx(r,n,e,t,i))i.stopPropagation();else if(Ph(n,i),e&4&&-1<Yx.indexOf(n)){for(;r!==null;){var s=ga(r);if(s!==null&&v0(s),s=vd(n,e,t,i),s===null&&Yc(n,e,i,Pl,t),s===r)break;r=s}r!==null&&i.stopPropagation()}else Yc(n,e,i,null,t)}}var Pl=null;function vd(n,e,t,i){if(Pl=null,n=df(i),n=Ir(n),n!==null)if(e=jr(n),e===null)n=null;else if(t=e.tag,t===13){if(n=c0(e),n!==null)return n;n=null}else if(t===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;n=null}else e!==n&&(n=null);return Pl=n,null}function S0(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(zx()){case ff:return 1;case h0:return 4;case bl:case Bx:return 16;case p0:return 536870912;default:return 16}default:return 16}}var qi=null,gf=null,fl=null;function E0(){if(fl)return fl;var n,e=gf,t=e.length,i,r="value"in qi?qi.value:qi.textContent,s=r.length;for(n=0;n<t&&e[n]===r[n];n++);var o=t-n;for(i=1;i<=o&&e[t-i]===r[s-i];i++);return fl=r.slice(n,1<i?1-i:void 0)}function hl(n){var e=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&e===13&&(n=13)):n=e,n===10&&(n=13),32<=n||n===13?n:0}function Ra(){return!0}function Lh(){return!1}function bn(n){function e(t,i,r,s,o){this._reactName=t,this._targetInst=r,this.type=i,this.nativeEvent=s,this.target=o,this.currentTarget=null;for(var a in n)n.hasOwnProperty(a)&&(t=n[a],this[a]=t?t(s):s[a]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?Ra:Lh,this.isPropagationStopped=Lh,this}return _t(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var t=this.nativeEvent;t&&(t.preventDefault?t.preventDefault():typeof t.returnValue!="unknown"&&(t.returnValue=!1),this.isDefaultPrevented=Ra)},stopPropagation:function(){var t=this.nativeEvent;t&&(t.stopPropagation?t.stopPropagation():typeof t.cancelBubble!="unknown"&&(t.cancelBubble=!0),this.isPropagationStopped=Ra)},persist:function(){},isPersistent:Ra}),e}var no={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},vf=bn(no),ma=_t({},no,{view:0,detail:0}),Qx=bn(ma),zc,Bc,mo,cc=_t({},ma,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:_f,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==mo&&(mo&&n.type==="mousemove"?(zc=n.screenX-mo.screenX,Bc=n.screenY-mo.screenY):Bc=zc=0,mo=n),zc)},movementY:function(n){return"movementY"in n?n.movementY:Bc}}),Ih=bn(cc),ey=_t({},cc,{dataTransfer:0}),ty=bn(ey),ny=_t({},ma,{relatedTarget:0}),Vc=bn(ny),iy=_t({},no,{animationName:0,elapsedTime:0,pseudoElement:0}),ry=bn(iy),sy=_t({},no,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),oy=bn(sy),ay=_t({},no,{data:0}),Dh=bn(ay),ly={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},cy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},uy={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function dy(n){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(n):(n=uy[n])?!!e[n]:!1}function _f(){return dy}var fy=_t({},ma,{key:function(n){if(n.key){var e=ly[n.key]||n.key;if(e!=="Unidentified")return e}return n.type==="keypress"?(n=hl(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?cy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:_f,charCode:function(n){return n.type==="keypress"?hl(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?hl(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),hy=bn(fy),py=_t({},cc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Uh=bn(py),my=_t({},ma,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:_f}),gy=bn(my),vy=_t({},no,{propertyName:0,elapsedTime:0,pseudoElement:0}),_y=bn(vy),xy=_t({},cc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),yy=bn(xy),My=[9,13,27,32],xf=Ci&&"CompositionEvent"in window,Fo=null;Ci&&"documentMode"in document&&(Fo=document.documentMode);var Sy=Ci&&"TextEvent"in window&&!Fo,w0=Ci&&(!xf||Fo&&8<Fo&&11>=Fo),Fh=" ",Oh=!1;function T0(n,e){switch(n){case"keyup":return My.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function A0(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var _s=!1;function Ey(n,e){switch(n){case"compositionend":return A0(e);case"keypress":return e.which!==32?null:(Oh=!0,Fh);case"textInput":return n=e.data,n===Fh&&Oh?null:n;default:return null}}function wy(n,e){if(_s)return n==="compositionend"||!xf&&T0(n,e)?(n=E0(),fl=gf=qi=null,_s=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return w0&&e.locale!=="ko"?null:e.data;default:return null}}var Ty={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function kh(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e==="input"?!!Ty[n.type]:e==="textarea"}function b0(n,e,t,i){r0(i),e=Nl(e,"onChange"),0<e.length&&(t=new vf("onChange","change",null,t,i),n.push({event:t,listeners:e}))}var Oo=null,Jo=null;function Ay(n){k0(n,0)}function uc(n){var e=Ms(n);if(Zg(e))return n}function by(n,e){if(n==="change")return e}var C0=!1;if(Ci){var Hc;if(Ci){var Gc="oninput"in document;if(!Gc){var zh=document.createElement("div");zh.setAttribute("oninput","return;"),Gc=typeof zh.oninput=="function"}Hc=Gc}else Hc=!1;C0=Hc&&(!document.documentMode||9<document.documentMode)}function Bh(){Oo&&(Oo.detachEvent("onpropertychange",R0),Jo=Oo=null)}function R0(n){if(n.propertyName==="value"&&uc(Jo)){var e=[];b0(e,Jo,n,df(n)),l0(Ay,e)}}function Cy(n,e,t){n==="focusin"?(Bh(),Oo=e,Jo=t,Oo.attachEvent("onpropertychange",R0)):n==="focusout"&&Bh()}function Ry(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return uc(Jo)}function Py(n,e){if(n==="click")return uc(e)}function Ny(n,e){if(n==="input"||n==="change")return uc(e)}function Ly(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var ti=typeof Object.is=="function"?Object.is:Ly;function Qo(n,e){if(ti(n,e))return!0;if(typeof n!="object"||n===null||typeof e!="object"||e===null)return!1;var t=Object.keys(n),i=Object.keys(e);if(t.length!==i.length)return!1;for(i=0;i<t.length;i++){var r=t[i];if(!Qu.call(e,r)||!ti(n[r],e[r]))return!1}return!0}function Vh(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function Hh(n,e){var t=Vh(n);n=0;for(var i;t;){if(t.nodeType===3){if(i=n+t.textContent.length,n<=e&&i>=e)return{node:t,offset:e-n};n=i}e:{for(;t;){if(t.nextSibling){t=t.nextSibling;break e}t=t.parentNode}t=void 0}t=Vh(t)}}function P0(n,e){return n&&e?n===e?!0:n&&n.nodeType===3?!1:e&&e.nodeType===3?P0(n,e.parentNode):"contains"in n?n.contains(e):n.compareDocumentPosition?!!(n.compareDocumentPosition(e)&16):!1:!1}function N0(){for(var n=window,e=wl();e instanceof n.HTMLIFrameElement;){try{var t=typeof e.contentWindow.location.href=="string"}catch{t=!1}if(t)n=e.contentWindow;else break;e=wl(n.document)}return e}function yf(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e&&(e==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||e==="textarea"||n.contentEditable==="true")}function Iy(n){var e=N0(),t=n.focusedElem,i=n.selectionRange;if(e!==t&&t&&t.ownerDocument&&P0(t.ownerDocument.documentElement,t)){if(i!==null&&yf(t)){if(e=i.start,n=i.end,n===void 0&&(n=e),"selectionStart"in t)t.selectionStart=e,t.selectionEnd=Math.min(n,t.value.length);else if(n=(e=t.ownerDocument||document)&&e.defaultView||window,n.getSelection){n=n.getSelection();var r=t.textContent.length,s=Math.min(i.start,r);i=i.end===void 0?s:Math.min(i.end,r),!n.extend&&s>i&&(r=i,i=s,s=r),r=Hh(t,s);var o=Hh(t,i);r&&o&&(n.rangeCount!==1||n.anchorNode!==r.node||n.anchorOffset!==r.offset||n.focusNode!==o.node||n.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(r.node,r.offset),n.removeAllRanges(),s>i?(n.addRange(e),n.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),n.addRange(e)))}}for(e=[],n=t;n=n.parentNode;)n.nodeType===1&&e.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof t.focus=="function"&&t.focus(),t=0;t<e.length;t++)n=e[t],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var Dy=Ci&&"documentMode"in document&&11>=document.documentMode,xs=null,_d=null,ko=null,xd=!1;function Gh(n,e,t){var i=t.window===t?t.document:t.nodeType===9?t:t.ownerDocument;xd||xs==null||xs!==wl(i)||(i=xs,"selectionStart"in i&&yf(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),ko&&Qo(ko,i)||(ko=i,i=Nl(_d,"onSelect"),0<i.length&&(e=new vf("onSelect","select",null,e,t),n.push({event:e,listeners:i}),e.target=xs)))}function Pa(n,e){var t={};return t[n.toLowerCase()]=e.toLowerCase(),t["Webkit"+n]="webkit"+e,t["Moz"+n]="moz"+e,t}var ys={animationend:Pa("Animation","AnimationEnd"),animationiteration:Pa("Animation","AnimationIteration"),animationstart:Pa("Animation","AnimationStart"),transitionend:Pa("Transition","TransitionEnd")},jc={},L0={};Ci&&(L0=document.createElement("div").style,"AnimationEvent"in window||(delete ys.animationend.animation,delete ys.animationiteration.animation,delete ys.animationstart.animation),"TransitionEvent"in window||delete ys.transitionend.transition);function dc(n){if(jc[n])return jc[n];if(!ys[n])return n;var e=ys[n],t;for(t in e)if(e.hasOwnProperty(t)&&t in L0)return jc[n]=e[t];return n}var I0=dc("animationend"),D0=dc("animationiteration"),U0=dc("animationstart"),F0=dc("transitionend"),O0=new Map,jh="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function gr(n,e){O0.set(n,e),Gr(e,[n])}for(var Wc=0;Wc<jh.length;Wc++){var Xc=jh[Wc],Uy=Xc.toLowerCase(),Fy=Xc[0].toUpperCase()+Xc.slice(1);gr(Uy,"on"+Fy)}gr(I0,"onAnimationEnd");gr(D0,"onAnimationIteration");gr(U0,"onAnimationStart");gr("dblclick","onDoubleClick");gr("focusin","onFocus");gr("focusout","onBlur");gr(F0,"onTransitionEnd");Bs("onMouseEnter",["mouseout","mouseover"]);Bs("onMouseLeave",["mouseout","mouseover"]);Bs("onPointerEnter",["pointerout","pointerover"]);Bs("onPointerLeave",["pointerout","pointerover"]);Gr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Gr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Gr("onBeforeInput",["compositionend","keypress","textInput","paste"]);Gr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Gr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Gr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Po="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Oy=new Set("cancel close invalid load scroll toggle".split(" ").concat(Po));function Wh(n,e,t){var i=n.type||"unknown-event";n.currentTarget=t,Ux(i,e,void 0,n),n.currentTarget=null}function k0(n,e){e=(e&4)!==0;for(var t=0;t<n.length;t++){var i=n[t],r=i.event;i=i.listeners;e:{var s=void 0;if(e)for(var o=i.length-1;0<=o;o--){var a=i[o],l=a.instance,c=a.currentTarget;if(a=a.listener,l!==s&&r.isPropagationStopped())break e;Wh(r,a,c),s=l}else for(o=0;o<i.length;o++){if(a=i[o],l=a.instance,c=a.currentTarget,a=a.listener,l!==s&&r.isPropagationStopped())break e;Wh(r,a,c),s=l}}}if(Al)throw n=pd,Al=!1,pd=null,n}function dt(n,e){var t=e[wd];t===void 0&&(t=e[wd]=new Set);var i=n+"__bubble";t.has(i)||(z0(e,n,2,!1),t.add(i))}function $c(n,e,t){var i=0;e&&(i|=4),z0(t,n,i,e)}var Na="_reactListening"+Math.random().toString(36).slice(2);function ea(n){if(!n[Na]){n[Na]=!0,Xg.forEach(function(t){t!=="selectionchange"&&(Oy.has(t)||$c(t,!1,n),$c(t,!0,n))});var e=n.nodeType===9?n:n.ownerDocument;e===null||e[Na]||(e[Na]=!0,$c("selectionchange",!1,e))}}function z0(n,e,t,i){switch(S0(e)){case 1:var r=Zx;break;case 4:r=Jx;break;default:r=mf}t=r.bind(null,e,t,n),r=void 0,!hd||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(r=!0),i?r!==void 0?n.addEventListener(e,t,{capture:!0,passive:r}):n.addEventListener(e,t,!0):r!==void 0?n.addEventListener(e,t,{passive:r}):n.addEventListener(e,t,!1)}function Yc(n,e,t,i,r){var s=i;if(!(e&1)&&!(e&2)&&i!==null)e:for(;;){if(i===null)return;var o=i.tag;if(o===3||o===4){var a=i.stateNode.containerInfo;if(a===r||a.nodeType===8&&a.parentNode===r)break;if(o===4)for(o=i.return;o!==null;){var l=o.tag;if((l===3||l===4)&&(l=o.stateNode.containerInfo,l===r||l.nodeType===8&&l.parentNode===r))return;o=o.return}for(;a!==null;){if(o=Ir(a),o===null)return;if(l=o.tag,l===5||l===6){i=s=o;continue e}a=a.parentNode}}i=i.return}l0(function(){var c=s,d=df(t),f=[];e:{var h=O0.get(n);if(h!==void 0){var p=vf,g=n;switch(n){case"keypress":if(hl(t)===0)break e;case"keydown":case"keyup":p=hy;break;case"focusin":g="focus",p=Vc;break;case"focusout":g="blur",p=Vc;break;case"beforeblur":case"afterblur":p=Vc;break;case"click":if(t.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":p=Ih;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":p=ty;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":p=gy;break;case I0:case D0:case U0:p=ry;break;case F0:p=_y;break;case"scroll":p=Qx;break;case"wheel":p=yy;break;case"copy":case"cut":case"paste":p=oy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":p=Uh}var y=(e&4)!==0,m=!y&&n==="scroll",u=y?h!==null?h+"Capture":null:h;y=[];for(var _=c,v;_!==null;){v=_;var M=v.stateNode;if(v.tag===5&&M!==null&&(v=M,u!==null&&(M=Yo(_,u),M!=null&&y.push(ta(_,M,v)))),m)break;_=_.return}0<y.length&&(h=new p(h,g,null,t,d),f.push({event:h,listeners:y}))}}if(!(e&7)){e:{if(h=n==="mouseover"||n==="pointerover",p=n==="mouseout"||n==="pointerout",h&&t!==dd&&(g=t.relatedTarget||t.fromElement)&&(Ir(g)||g[Ri]))break e;if((p||h)&&(h=d.window===d?d:(h=d.ownerDocument)?h.defaultView||h.parentWindow:window,p?(g=t.relatedTarget||t.toElement,p=c,g=g?Ir(g):null,g!==null&&(m=jr(g),g!==m||g.tag!==5&&g.tag!==6)&&(g=null)):(p=null,g=c),p!==g)){if(y=Ih,M="onMouseLeave",u="onMouseEnter",_="mouse",(n==="pointerout"||n==="pointerover")&&(y=Uh,M="onPointerLeave",u="onPointerEnter",_="pointer"),m=p==null?h:Ms(p),v=g==null?h:Ms(g),h=new y(M,_+"leave",p,t,d),h.target=m,h.relatedTarget=v,M=null,Ir(d)===c&&(y=new y(u,_+"enter",g,t,d),y.target=v,y.relatedTarget=m,M=y),m=M,p&&g)t:{for(y=p,u=g,_=0,v=y;v;v=$r(v))_++;for(v=0,M=u;M;M=$r(M))v++;for(;0<_-v;)y=$r(y),_--;for(;0<v-_;)u=$r(u),v--;for(;_--;){if(y===u||u!==null&&y===u.alternate)break t;y=$r(y),u=$r(u)}y=null}else y=null;p!==null&&Xh(f,h,p,y,!1),g!==null&&m!==null&&Xh(f,m,g,y,!0)}}e:{if(h=c?Ms(c):window,p=h.nodeName&&h.nodeName.toLowerCase(),p==="select"||p==="input"&&h.type==="file")var A=by;else if(kh(h))if(C0)A=Ny;else{A=Ry;var b=Cy}else(p=h.nodeName)&&p.toLowerCase()==="input"&&(h.type==="checkbox"||h.type==="radio")&&(A=Py);if(A&&(A=A(n,c))){b0(f,A,t,d);break e}b&&b(n,h,c),n==="focusout"&&(b=h._wrapperState)&&b.controlled&&h.type==="number"&&od(h,"number",h.value)}switch(b=c?Ms(c):window,n){case"focusin":(kh(b)||b.contentEditable==="true")&&(xs=b,_d=c,ko=null);break;case"focusout":ko=_d=xs=null;break;case"mousedown":xd=!0;break;case"contextmenu":case"mouseup":case"dragend":xd=!1,Gh(f,t,d);break;case"selectionchange":if(Dy)break;case"keydown":case"keyup":Gh(f,t,d)}var T;if(xf)e:{switch(n){case"compositionstart":var N="onCompositionStart";break e;case"compositionend":N="onCompositionEnd";break e;case"compositionupdate":N="onCompositionUpdate";break e}N=void 0}else _s?T0(n,t)&&(N="onCompositionEnd"):n==="keydown"&&t.keyCode===229&&(N="onCompositionStart");N&&(w0&&t.locale!=="ko"&&(_s||N!=="onCompositionStart"?N==="onCompositionEnd"&&_s&&(T=E0()):(qi=d,gf="value"in qi?qi.value:qi.textContent,_s=!0)),b=Nl(c,N),0<b.length&&(N=new Dh(N,n,null,t,d),f.push({event:N,listeners:b}),T?N.data=T:(T=A0(t),T!==null&&(N.data=T)))),(T=Sy?Ey(n,t):wy(n,t))&&(c=Nl(c,"onBeforeInput"),0<c.length&&(d=new Dh("onBeforeInput","beforeinput",null,t,d),f.push({event:d,listeners:c}),d.data=T))}k0(f,e)})}function ta(n,e,t){return{instance:n,listener:e,currentTarget:t}}function Nl(n,e){for(var t=e+"Capture",i=[];n!==null;){var r=n,s=r.stateNode;r.tag===5&&s!==null&&(r=s,s=Yo(n,t),s!=null&&i.unshift(ta(n,s,r)),s=Yo(n,e),s!=null&&i.push(ta(n,s,r))),n=n.return}return i}function $r(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Xh(n,e,t,i,r){for(var s=e._reactName,o=[];t!==null&&t!==i;){var a=t,l=a.alternate,c=a.stateNode;if(l!==null&&l===i)break;a.tag===5&&c!==null&&(a=c,r?(l=Yo(t,s),l!=null&&o.unshift(ta(t,l,a))):r||(l=Yo(t,s),l!=null&&o.push(ta(t,l,a)))),t=t.return}o.length!==0&&n.push({event:e,listeners:o})}var ky=/\r\n?/g,zy=/\u0000|\uFFFD/g;function $h(n){return(typeof n=="string"?n:""+n).replace(ky,`
`).replace(zy,"")}function La(n,e,t){if(e=$h(e),$h(n)!==e&&t)throw Error(le(425))}function Ll(){}var yd=null,Md=null;function Sd(n,e){return n==="textarea"||n==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var Ed=typeof setTimeout=="function"?setTimeout:void 0,By=typeof clearTimeout=="function"?clearTimeout:void 0,Yh=typeof Promise=="function"?Promise:void 0,Vy=typeof queueMicrotask=="function"?queueMicrotask:typeof Yh<"u"?function(n){return Yh.resolve(null).then(n).catch(Hy)}:Ed;function Hy(n){setTimeout(function(){throw n})}function qc(n,e){var t=e,i=0;do{var r=t.nextSibling;if(n.removeChild(t),r&&r.nodeType===8)if(t=r.data,t==="/$"){if(i===0){n.removeChild(r),Zo(e);return}i--}else t!=="$"&&t!=="$?"&&t!=="$!"||i++;t=r}while(t);Zo(e)}function ir(n){for(;n!=null;n=n.nextSibling){var e=n.nodeType;if(e===1||e===3)break;if(e===8){if(e=n.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return n}function qh(n){n=n.previousSibling;for(var e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="$"||t==="$!"||t==="$?"){if(e===0)return n;e--}else t==="/$"&&e++}n=n.previousSibling}return null}var io=Math.random().toString(36).slice(2),oi="__reactFiber$"+io,na="__reactProps$"+io,Ri="__reactContainer$"+io,wd="__reactEvents$"+io,Gy="__reactListeners$"+io,jy="__reactHandles$"+io;function Ir(n){var e=n[oi];if(e)return e;for(var t=n.parentNode;t;){if(e=t[Ri]||t[oi]){if(t=e.alternate,e.child!==null||t!==null&&t.child!==null)for(n=qh(n);n!==null;){if(t=n[oi])return t;n=qh(n)}return e}n=t,t=n.parentNode}return null}function ga(n){return n=n[oi]||n[Ri],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Ms(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(le(33))}function fc(n){return n[na]||null}var Td=[],Ss=-1;function vr(n){return{current:n}}function ft(n){0>Ss||(n.current=Td[Ss],Td[Ss]=null,Ss--)}function ct(n,e){Ss++,Td[Ss]=n.current,n.current=e}var fr={},en=vr(fr),un=vr(!1),kr=fr;function Vs(n,e){var t=n.type.contextTypes;if(!t)return fr;var i=n.stateNode;if(i&&i.__reactInternalMemoizedUnmaskedChildContext===e)return i.__reactInternalMemoizedMaskedChildContext;var r={},s;for(s in t)r[s]=e[s];return i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=e,n.__reactInternalMemoizedMaskedChildContext=r),r}function dn(n){return n=n.childContextTypes,n!=null}function Il(){ft(un),ft(en)}function Kh(n,e,t){if(en.current!==fr)throw Error(le(168));ct(en,e),ct(un,t)}function B0(n,e,t){var i=n.stateNode;if(e=e.childContextTypes,typeof i.getChildContext!="function")return t;i=i.getChildContext();for(var r in i)if(!(r in e))throw Error(le(108,Cx(n)||"Unknown",r));return _t({},t,i)}function Dl(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||fr,kr=en.current,ct(en,n),ct(un,un.current),!0}function Zh(n,e,t){var i=n.stateNode;if(!i)throw Error(le(169));t?(n=B0(n,e,kr),i.__reactInternalMemoizedMergedChildContext=n,ft(un),ft(en),ct(en,n)):ft(un),ct(un,t)}var Mi=null,hc=!1,Kc=!1;function V0(n){Mi===null?Mi=[n]:Mi.push(n)}function Wy(n){hc=!0,V0(n)}function _r(){if(!Kc&&Mi!==null){Kc=!0;var n=0,e=ot;try{var t=Mi;for(ot=1;n<t.length;n++){var i=t[n];do i=i(!0);while(i!==null)}Mi=null,hc=!1}catch(r){throw Mi!==null&&(Mi=Mi.slice(n+1)),f0(ff,_r),r}finally{ot=e,Kc=!1}}return null}var Es=[],ws=0,Ul=null,Fl=0,Ln=[],In=0,zr=null,Ei=1,wi="";function br(n,e){Es[ws++]=Fl,Es[ws++]=Ul,Ul=n,Fl=e}function H0(n,e,t){Ln[In++]=Ei,Ln[In++]=wi,Ln[In++]=zr,zr=n;var i=Ei;n=wi;var r=32-Jn(i)-1;i&=~(1<<r),t+=1;var s=32-Jn(e)+r;if(30<s){var o=r-r%5;s=(i&(1<<o)-1).toString(32),i>>=o,r-=o,Ei=1<<32-Jn(e)+r|t<<r|i,wi=s+n}else Ei=1<<s|t<<r|i,wi=n}function Mf(n){n.return!==null&&(br(n,1),H0(n,1,0))}function Sf(n){for(;n===Ul;)Ul=Es[--ws],Es[ws]=null,Fl=Es[--ws],Es[ws]=null;for(;n===zr;)zr=Ln[--In],Ln[In]=null,wi=Ln[--In],Ln[In]=null,Ei=Ln[--In],Ln[In]=null}var wn=null,Mn=null,pt=!1,qn=null;function G0(n,e){var t=On(5,null,null,0);t.elementType="DELETED",t.stateNode=e,t.return=n,e=n.deletions,e===null?(n.deletions=[t],n.flags|=16):e.push(t)}function Jh(n,e){switch(n.tag){case 5:var t=n.type;return e=e.nodeType!==1||t.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(n.stateNode=e,wn=n,Mn=ir(e.firstChild),!0):!1;case 6:return e=n.pendingProps===""||e.nodeType!==3?null:e,e!==null?(n.stateNode=e,wn=n,Mn=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(t=zr!==null?{id:Ei,overflow:wi}:null,n.memoizedState={dehydrated:e,treeContext:t,retryLane:1073741824},t=On(18,null,null,0),t.stateNode=e,t.return=n,n.child=t,wn=n,Mn=null,!0):!1;default:return!1}}function Ad(n){return(n.mode&1)!==0&&(n.flags&128)===0}function bd(n){if(pt){var e=Mn;if(e){var t=e;if(!Jh(n,e)){if(Ad(n))throw Error(le(418));e=ir(t.nextSibling);var i=wn;e&&Jh(n,e)?G0(i,t):(n.flags=n.flags&-4097|2,pt=!1,wn=n)}}else{if(Ad(n))throw Error(le(418));n.flags=n.flags&-4097|2,pt=!1,wn=n}}}function Qh(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;wn=n}function Ia(n){if(n!==wn)return!1;if(!pt)return Qh(n),pt=!0,!1;var e;if((e=n.tag!==3)&&!(e=n.tag!==5)&&(e=n.type,e=e!=="head"&&e!=="body"&&!Sd(n.type,n.memoizedProps)),e&&(e=Mn)){if(Ad(n))throw j0(),Error(le(418));for(;e;)G0(n,e),e=ir(e.nextSibling)}if(Qh(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(le(317));e:{for(n=n.nextSibling,e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="/$"){if(e===0){Mn=ir(n.nextSibling);break e}e--}else t!=="$"&&t!=="$!"&&t!=="$?"||e++}n=n.nextSibling}Mn=null}}else Mn=wn?ir(n.stateNode.nextSibling):null;return!0}function j0(){for(var n=Mn;n;)n=ir(n.nextSibling)}function Hs(){Mn=wn=null,pt=!1}function Ef(n){qn===null?qn=[n]:qn.push(n)}var Xy=Li.ReactCurrentBatchConfig;function go(n,e,t){if(n=t.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(t._owner){if(t=t._owner,t){if(t.tag!==1)throw Error(le(309));var i=t.stateNode}if(!i)throw Error(le(147,n));var r=i,s=""+n;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(o){var a=r.refs;o===null?delete a[s]:a[s]=o},e._stringRef=s,e)}if(typeof n!="string")throw Error(le(284));if(!t._owner)throw Error(le(290,n))}return n}function Da(n,e){throw n=Object.prototype.toString.call(e),Error(le(31,n==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":n))}function ep(n){var e=n._init;return e(n._payload)}function W0(n){function e(u,_){if(n){var v=u.deletions;v===null?(u.deletions=[_],u.flags|=16):v.push(_)}}function t(u,_){if(!n)return null;for(;_!==null;)e(u,_),_=_.sibling;return null}function i(u,_){for(u=new Map;_!==null;)_.key!==null?u.set(_.key,_):u.set(_.index,_),_=_.sibling;return u}function r(u,_){return u=ar(u,_),u.index=0,u.sibling=null,u}function s(u,_,v){return u.index=v,n?(v=u.alternate,v!==null?(v=v.index,v<_?(u.flags|=2,_):v):(u.flags|=2,_)):(u.flags|=1048576,_)}function o(u){return n&&u.alternate===null&&(u.flags|=2),u}function a(u,_,v,M){return _===null||_.tag!==6?(_=iu(v,u.mode,M),_.return=u,_):(_=r(_,v),_.return=u,_)}function l(u,_,v,M){var A=v.type;return A===vs?d(u,_,v.props.children,M,v.key):_!==null&&(_.elementType===A||typeof A=="object"&&A!==null&&A.$$typeof===ji&&ep(A)===_.type)?(M=r(_,v.props),M.ref=go(u,_,v),M.return=u,M):(M=yl(v.type,v.key,v.props,null,u.mode,M),M.ref=go(u,_,v),M.return=u,M)}function c(u,_,v,M){return _===null||_.tag!==4||_.stateNode.containerInfo!==v.containerInfo||_.stateNode.implementation!==v.implementation?(_=ru(v,u.mode,M),_.return=u,_):(_=r(_,v.children||[]),_.return=u,_)}function d(u,_,v,M,A){return _===null||_.tag!==7?(_=Or(v,u.mode,M,A),_.return=u,_):(_=r(_,v),_.return=u,_)}function f(u,_,v){if(typeof _=="string"&&_!==""||typeof _=="number")return _=iu(""+_,u.mode,v),_.return=u,_;if(typeof _=="object"&&_!==null){switch(_.$$typeof){case Ea:return v=yl(_.type,_.key,_.props,null,u.mode,v),v.ref=go(u,null,_),v.return=u,v;case gs:return _=ru(_,u.mode,v),_.return=u,_;case ji:var M=_._init;return f(u,M(_._payload),v)}if(Co(_)||uo(_))return _=Or(_,u.mode,v,null),_.return=u,_;Da(u,_)}return null}function h(u,_,v,M){var A=_!==null?_.key:null;if(typeof v=="string"&&v!==""||typeof v=="number")return A!==null?null:a(u,_,""+v,M);if(typeof v=="object"&&v!==null){switch(v.$$typeof){case Ea:return v.key===A?l(u,_,v,M):null;case gs:return v.key===A?c(u,_,v,M):null;case ji:return A=v._init,h(u,_,A(v._payload),M)}if(Co(v)||uo(v))return A!==null?null:d(u,_,v,M,null);Da(u,v)}return null}function p(u,_,v,M,A){if(typeof M=="string"&&M!==""||typeof M=="number")return u=u.get(v)||null,a(_,u,""+M,A);if(typeof M=="object"&&M!==null){switch(M.$$typeof){case Ea:return u=u.get(M.key===null?v:M.key)||null,l(_,u,M,A);case gs:return u=u.get(M.key===null?v:M.key)||null,c(_,u,M,A);case ji:var b=M._init;return p(u,_,v,b(M._payload),A)}if(Co(M)||uo(M))return u=u.get(v)||null,d(_,u,M,A,null);Da(_,M)}return null}function g(u,_,v,M){for(var A=null,b=null,T=_,N=_=0,w=null;T!==null&&N<v.length;N++){T.index>N?(w=T,T=null):w=T.sibling;var S=h(u,T,v[N],M);if(S===null){T===null&&(T=w);break}n&&T&&S.alternate===null&&e(u,T),_=s(S,_,N),b===null?A=S:b.sibling=S,b=S,T=w}if(N===v.length)return t(u,T),pt&&br(u,N),A;if(T===null){for(;N<v.length;N++)T=f(u,v[N],M),T!==null&&(_=s(T,_,N),b===null?A=T:b.sibling=T,b=T);return pt&&br(u,N),A}for(T=i(u,T);N<v.length;N++)w=p(T,u,N,v[N],M),w!==null&&(n&&w.alternate!==null&&T.delete(w.key===null?N:w.key),_=s(w,_,N),b===null?A=w:b.sibling=w,b=w);return n&&T.forEach(function(D){return e(u,D)}),pt&&br(u,N),A}function y(u,_,v,M){var A=uo(v);if(typeof A!="function")throw Error(le(150));if(v=A.call(v),v==null)throw Error(le(151));for(var b=A=null,T=_,N=_=0,w=null,S=v.next();T!==null&&!S.done;N++,S=v.next()){T.index>N?(w=T,T=null):w=T.sibling;var D=h(u,T,S.value,M);if(D===null){T===null&&(T=w);break}n&&T&&D.alternate===null&&e(u,T),_=s(D,_,N),b===null?A=D:b.sibling=D,b=D,T=w}if(S.done)return t(u,T),pt&&br(u,N),A;if(T===null){for(;!S.done;N++,S=v.next())S=f(u,S.value,M),S!==null&&(_=s(S,_,N),b===null?A=S:b.sibling=S,b=S);return pt&&br(u,N),A}for(T=i(u,T);!S.done;N++,S=v.next())S=p(T,u,N,S.value,M),S!==null&&(n&&S.alternate!==null&&T.delete(S.key===null?N:S.key),_=s(S,_,N),b===null?A=S:b.sibling=S,b=S);return n&&T.forEach(function(V){return e(u,V)}),pt&&br(u,N),A}function m(u,_,v,M){if(typeof v=="object"&&v!==null&&v.type===vs&&v.key===null&&(v=v.props.children),typeof v=="object"&&v!==null){switch(v.$$typeof){case Ea:e:{for(var A=v.key,b=_;b!==null;){if(b.key===A){if(A=v.type,A===vs){if(b.tag===7){t(u,b.sibling),_=r(b,v.props.children),_.return=u,u=_;break e}}else if(b.elementType===A||typeof A=="object"&&A!==null&&A.$$typeof===ji&&ep(A)===b.type){t(u,b.sibling),_=r(b,v.props),_.ref=go(u,b,v),_.return=u,u=_;break e}t(u,b);break}else e(u,b);b=b.sibling}v.type===vs?(_=Or(v.props.children,u.mode,M,v.key),_.return=u,u=_):(M=yl(v.type,v.key,v.props,null,u.mode,M),M.ref=go(u,_,v),M.return=u,u=M)}return o(u);case gs:e:{for(b=v.key;_!==null;){if(_.key===b)if(_.tag===4&&_.stateNode.containerInfo===v.containerInfo&&_.stateNode.implementation===v.implementation){t(u,_.sibling),_=r(_,v.children||[]),_.return=u,u=_;break e}else{t(u,_);break}else e(u,_);_=_.sibling}_=ru(v,u.mode,M),_.return=u,u=_}return o(u);case ji:return b=v._init,m(u,_,b(v._payload),M)}if(Co(v))return g(u,_,v,M);if(uo(v))return y(u,_,v,M);Da(u,v)}return typeof v=="string"&&v!==""||typeof v=="number"?(v=""+v,_!==null&&_.tag===6?(t(u,_.sibling),_=r(_,v),_.return=u,u=_):(t(u,_),_=iu(v,u.mode,M),_.return=u,u=_),o(u)):t(u,_)}return m}var Gs=W0(!0),X0=W0(!1),Ol=vr(null),kl=null,Ts=null,wf=null;function Tf(){wf=Ts=kl=null}function Af(n){var e=Ol.current;ft(Ol),n._currentValue=e}function Cd(n,e,t){for(;n!==null;){var i=n.alternate;if((n.childLanes&e)!==e?(n.childLanes|=e,i!==null&&(i.childLanes|=e)):i!==null&&(i.childLanes&e)!==e&&(i.childLanes|=e),n===t)break;n=n.return}}function Ds(n,e){kl=n,wf=Ts=null,n=n.dependencies,n!==null&&n.firstContext!==null&&(n.lanes&e&&(cn=!0),n.firstContext=null)}function Bn(n){var e=n._currentValue;if(wf!==n)if(n={context:n,memoizedValue:e,next:null},Ts===null){if(kl===null)throw Error(le(308));Ts=n,kl.dependencies={lanes:0,firstContext:n}}else Ts=Ts.next=n;return e}var Dr=null;function bf(n){Dr===null?Dr=[n]:Dr.push(n)}function $0(n,e,t,i){var r=e.interleaved;return r===null?(t.next=t,bf(e)):(t.next=r.next,r.next=t),e.interleaved=t,Pi(n,i)}function Pi(n,e){n.lanes|=e;var t=n.alternate;for(t!==null&&(t.lanes|=e),t=n,n=n.return;n!==null;)n.childLanes|=e,t=n.alternate,t!==null&&(t.childLanes|=e),t=n,n=n.return;return t.tag===3?t.stateNode:null}var Wi=!1;function Cf(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Y0(n,e){n=n.updateQueue,e.updateQueue===n&&(e.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Ai(n,e){return{eventTime:n,lane:e,tag:0,payload:null,callback:null,next:null}}function rr(n,e,t){var i=n.updateQueue;if(i===null)return null;if(i=i.shared,Je&2){var r=i.pending;return r===null?e.next=e:(e.next=r.next,r.next=e),i.pending=e,Pi(n,t)}return r=i.interleaved,r===null?(e.next=e,bf(i)):(e.next=r.next,r.next=e),i.interleaved=e,Pi(n,t)}function pl(n,e,t){if(e=e.updateQueue,e!==null&&(e=e.shared,(t&4194240)!==0)){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,hf(n,t)}}function tp(n,e){var t=n.updateQueue,i=n.alternate;if(i!==null&&(i=i.updateQueue,t===i)){var r=null,s=null;if(t=t.firstBaseUpdate,t!==null){do{var o={eventTime:t.eventTime,lane:t.lane,tag:t.tag,payload:t.payload,callback:t.callback,next:null};s===null?r=s=o:s=s.next=o,t=t.next}while(t!==null);s===null?r=s=e:s=s.next=e}else r=s=e;t={baseState:i.baseState,firstBaseUpdate:r,lastBaseUpdate:s,shared:i.shared,effects:i.effects},n.updateQueue=t;return}n=t.lastBaseUpdate,n===null?t.firstBaseUpdate=e:n.next=e,t.lastBaseUpdate=e}function zl(n,e,t,i){var r=n.updateQueue;Wi=!1;var s=r.firstBaseUpdate,o=r.lastBaseUpdate,a=r.shared.pending;if(a!==null){r.shared.pending=null;var l=a,c=l.next;l.next=null,o===null?s=c:o.next=c,o=l;var d=n.alternate;d!==null&&(d=d.updateQueue,a=d.lastBaseUpdate,a!==o&&(a===null?d.firstBaseUpdate=c:a.next=c,d.lastBaseUpdate=l))}if(s!==null){var f=r.baseState;o=0,d=c=l=null,a=s;do{var h=a.lane,p=a.eventTime;if((i&h)===h){d!==null&&(d=d.next={eventTime:p,lane:0,tag:a.tag,payload:a.payload,callback:a.callback,next:null});e:{var g=n,y=a;switch(h=e,p=t,y.tag){case 1:if(g=y.payload,typeof g=="function"){f=g.call(p,f,h);break e}f=g;break e;case 3:g.flags=g.flags&-65537|128;case 0:if(g=y.payload,h=typeof g=="function"?g.call(p,f,h):g,h==null)break e;f=_t({},f,h);break e;case 2:Wi=!0}}a.callback!==null&&a.lane!==0&&(n.flags|=64,h=r.effects,h===null?r.effects=[a]:h.push(a))}else p={eventTime:p,lane:h,tag:a.tag,payload:a.payload,callback:a.callback,next:null},d===null?(c=d=p,l=f):d=d.next=p,o|=h;if(a=a.next,a===null){if(a=r.shared.pending,a===null)break;h=a,a=h.next,h.next=null,r.lastBaseUpdate=h,r.shared.pending=null}}while(!0);if(d===null&&(l=f),r.baseState=l,r.firstBaseUpdate=c,r.lastBaseUpdate=d,e=r.shared.interleaved,e!==null){r=e;do o|=r.lane,r=r.next;while(r!==e)}else s===null&&(r.shared.lanes=0);Vr|=o,n.lanes=o,n.memoizedState=f}}function np(n,e,t){if(n=e.effects,e.effects=null,n!==null)for(e=0;e<n.length;e++){var i=n[e],r=i.callback;if(r!==null){if(i.callback=null,i=t,typeof r!="function")throw Error(le(191,r));r.call(i)}}}var va={},ci=vr(va),ia=vr(va),ra=vr(va);function Ur(n){if(n===va)throw Error(le(174));return n}function Rf(n,e){switch(ct(ra,e),ct(ia,n),ct(ci,va),n=e.nodeType,n){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:ld(null,"");break;default:n=n===8?e.parentNode:e,e=n.namespaceURI||null,n=n.tagName,e=ld(e,n)}ft(ci),ct(ci,e)}function js(){ft(ci),ft(ia),ft(ra)}function q0(n){Ur(ra.current);var e=Ur(ci.current),t=ld(e,n.type);e!==t&&(ct(ia,n),ct(ci,t))}function Pf(n){ia.current===n&&(ft(ci),ft(ia))}var gt=vr(0);function Bl(n){for(var e=n;e!==null;){if(e.tag===13){var t=e.memoizedState;if(t!==null&&(t=t.dehydrated,t===null||t.data==="$?"||t.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var Zc=[];function Nf(){for(var n=0;n<Zc.length;n++)Zc[n]._workInProgressVersionPrimary=null;Zc.length=0}var ml=Li.ReactCurrentDispatcher,Jc=Li.ReactCurrentBatchConfig,Br=0,vt=null,Ct=null,Dt=null,Vl=!1,zo=!1,sa=0,$y=0;function Xt(){throw Error(le(321))}function Lf(n,e){if(e===null)return!1;for(var t=0;t<e.length&&t<n.length;t++)if(!ti(n[t],e[t]))return!1;return!0}function If(n,e,t,i,r,s){if(Br=s,vt=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,ml.current=n===null||n.memoizedState===null?Zy:Jy,n=t(i,r),zo){s=0;do{if(zo=!1,sa=0,25<=s)throw Error(le(301));s+=1,Dt=Ct=null,e.updateQueue=null,ml.current=Qy,n=t(i,r)}while(zo)}if(ml.current=Hl,e=Ct!==null&&Ct.next!==null,Br=0,Dt=Ct=vt=null,Vl=!1,e)throw Error(le(300));return n}function Df(){var n=sa!==0;return sa=0,n}function ri(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Dt===null?vt.memoizedState=Dt=n:Dt=Dt.next=n,Dt}function Vn(){if(Ct===null){var n=vt.alternate;n=n!==null?n.memoizedState:null}else n=Ct.next;var e=Dt===null?vt.memoizedState:Dt.next;if(e!==null)Dt=e,Ct=n;else{if(n===null)throw Error(le(310));Ct=n,n={memoizedState:Ct.memoizedState,baseState:Ct.baseState,baseQueue:Ct.baseQueue,queue:Ct.queue,next:null},Dt===null?vt.memoizedState=Dt=n:Dt=Dt.next=n}return Dt}function oa(n,e){return typeof e=="function"?e(n):e}function Qc(n){var e=Vn(),t=e.queue;if(t===null)throw Error(le(311));t.lastRenderedReducer=n;var i=Ct,r=i.baseQueue,s=t.pending;if(s!==null){if(r!==null){var o=r.next;r.next=s.next,s.next=o}i.baseQueue=r=s,t.pending=null}if(r!==null){s=r.next,i=i.baseState;var a=o=null,l=null,c=s;do{var d=c.lane;if((Br&d)===d)l!==null&&(l=l.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),i=c.hasEagerState?c.eagerState:n(i,c.action);else{var f={lane:d,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};l===null?(a=l=f,o=i):l=l.next=f,vt.lanes|=d,Vr|=d}c=c.next}while(c!==null&&c!==s);l===null?o=i:l.next=a,ti(i,e.memoizedState)||(cn=!0),e.memoizedState=i,e.baseState=o,e.baseQueue=l,t.lastRenderedState=i}if(n=t.interleaved,n!==null){r=n;do s=r.lane,vt.lanes|=s,Vr|=s,r=r.next;while(r!==n)}else r===null&&(t.lanes=0);return[e.memoizedState,t.dispatch]}function eu(n){var e=Vn(),t=e.queue;if(t===null)throw Error(le(311));t.lastRenderedReducer=n;var i=t.dispatch,r=t.pending,s=e.memoizedState;if(r!==null){t.pending=null;var o=r=r.next;do s=n(s,o.action),o=o.next;while(o!==r);ti(s,e.memoizedState)||(cn=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),t.lastRenderedState=s}return[s,i]}function K0(){}function Z0(n,e){var t=vt,i=Vn(),r=e(),s=!ti(i.memoizedState,r);if(s&&(i.memoizedState=r,cn=!0),i=i.queue,Uf(ev.bind(null,t,i,n),[n]),i.getSnapshot!==e||s||Dt!==null&&Dt.memoizedState.tag&1){if(t.flags|=2048,aa(9,Q0.bind(null,t,i,r,e),void 0,null),Ft===null)throw Error(le(349));Br&30||J0(t,e,r)}return r}function J0(n,e,t){n.flags|=16384,n={getSnapshot:e,value:t},e=vt.updateQueue,e===null?(e={lastEffect:null,stores:null},vt.updateQueue=e,e.stores=[n]):(t=e.stores,t===null?e.stores=[n]:t.push(n))}function Q0(n,e,t,i){e.value=t,e.getSnapshot=i,tv(e)&&nv(n)}function ev(n,e,t){return t(function(){tv(e)&&nv(n)})}function tv(n){var e=n.getSnapshot;n=n.value;try{var t=e();return!ti(n,t)}catch{return!0}}function nv(n){var e=Pi(n,1);e!==null&&Qn(e,n,1,-1)}function ip(n){var e=ri();return typeof n=="function"&&(n=n()),e.memoizedState=e.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:oa,lastRenderedState:n},e.queue=n,n=n.dispatch=Ky.bind(null,vt,n),[e.memoizedState,n]}function aa(n,e,t,i){return n={tag:n,create:e,destroy:t,deps:i,next:null},e=vt.updateQueue,e===null?(e={lastEffect:null,stores:null},vt.updateQueue=e,e.lastEffect=n.next=n):(t=e.lastEffect,t===null?e.lastEffect=n.next=n:(i=t.next,t.next=n,n.next=i,e.lastEffect=n)),n}function iv(){return Vn().memoizedState}function gl(n,e,t,i){var r=ri();vt.flags|=n,r.memoizedState=aa(1|e,t,void 0,i===void 0?null:i)}function pc(n,e,t,i){var r=Vn();i=i===void 0?null:i;var s=void 0;if(Ct!==null){var o=Ct.memoizedState;if(s=o.destroy,i!==null&&Lf(i,o.deps)){r.memoizedState=aa(e,t,s,i);return}}vt.flags|=n,r.memoizedState=aa(1|e,t,s,i)}function rp(n,e){return gl(8390656,8,n,e)}function Uf(n,e){return pc(2048,8,n,e)}function rv(n,e){return pc(4,2,n,e)}function sv(n,e){return pc(4,4,n,e)}function ov(n,e){if(typeof e=="function")return n=n(),e(n),function(){e(null)};if(e!=null)return n=n(),e.current=n,function(){e.current=null}}function av(n,e,t){return t=t!=null?t.concat([n]):null,pc(4,4,ov.bind(null,e,n),t)}function Ff(){}function lv(n,e){var t=Vn();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&Lf(e,i[1])?i[0]:(t.memoizedState=[n,e],n)}function cv(n,e){var t=Vn();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&Lf(e,i[1])?i[0]:(n=n(),t.memoizedState=[n,e],n)}function uv(n,e,t){return Br&21?(ti(t,e)||(t=m0(),vt.lanes|=t,Vr|=t,n.baseState=!0),e):(n.baseState&&(n.baseState=!1,cn=!0),n.memoizedState=t)}function Yy(n,e){var t=ot;ot=t!==0&&4>t?t:4,n(!0);var i=Jc.transition;Jc.transition={};try{n(!1),e()}finally{ot=t,Jc.transition=i}}function dv(){return Vn().memoizedState}function qy(n,e,t){var i=or(n);if(t={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null},fv(n))hv(e,t);else if(t=$0(n,e,t,i),t!==null){var r=sn();Qn(t,n,i,r),pv(t,e,i)}}function Ky(n,e,t){var i=or(n),r={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null};if(fv(n))hv(e,r);else{var s=n.alternate;if(n.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var o=e.lastRenderedState,a=s(o,t);if(r.hasEagerState=!0,r.eagerState=a,ti(a,o)){var l=e.interleaved;l===null?(r.next=r,bf(e)):(r.next=l.next,l.next=r),e.interleaved=r;return}}catch{}finally{}t=$0(n,e,r,i),t!==null&&(r=sn(),Qn(t,n,i,r),pv(t,e,i))}}function fv(n){var e=n.alternate;return n===vt||e!==null&&e===vt}function hv(n,e){zo=Vl=!0;var t=n.pending;t===null?e.next=e:(e.next=t.next,t.next=e),n.pending=e}function pv(n,e,t){if(t&4194240){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,hf(n,t)}}var Hl={readContext:Bn,useCallback:Xt,useContext:Xt,useEffect:Xt,useImperativeHandle:Xt,useInsertionEffect:Xt,useLayoutEffect:Xt,useMemo:Xt,useReducer:Xt,useRef:Xt,useState:Xt,useDebugValue:Xt,useDeferredValue:Xt,useTransition:Xt,useMutableSource:Xt,useSyncExternalStore:Xt,useId:Xt,unstable_isNewReconciler:!1},Zy={readContext:Bn,useCallback:function(n,e){return ri().memoizedState=[n,e===void 0?null:e],n},useContext:Bn,useEffect:rp,useImperativeHandle:function(n,e,t){return t=t!=null?t.concat([n]):null,gl(4194308,4,ov.bind(null,e,n),t)},useLayoutEffect:function(n,e){return gl(4194308,4,n,e)},useInsertionEffect:function(n,e){return gl(4,2,n,e)},useMemo:function(n,e){var t=ri();return e=e===void 0?null:e,n=n(),t.memoizedState=[n,e],n},useReducer:function(n,e,t){var i=ri();return e=t!==void 0?t(e):e,i.memoizedState=i.baseState=e,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:e},i.queue=n,n=n.dispatch=qy.bind(null,vt,n),[i.memoizedState,n]},useRef:function(n){var e=ri();return n={current:n},e.memoizedState=n},useState:ip,useDebugValue:Ff,useDeferredValue:function(n){return ri().memoizedState=n},useTransition:function(){var n=ip(!1),e=n[0];return n=Yy.bind(null,n[1]),ri().memoizedState=n,[e,n]},useMutableSource:function(){},useSyncExternalStore:function(n,e,t){var i=vt,r=ri();if(pt){if(t===void 0)throw Error(le(407));t=t()}else{if(t=e(),Ft===null)throw Error(le(349));Br&30||J0(i,e,t)}r.memoizedState=t;var s={value:t,getSnapshot:e};return r.queue=s,rp(ev.bind(null,i,s,n),[n]),i.flags|=2048,aa(9,Q0.bind(null,i,s,t,e),void 0,null),t},useId:function(){var n=ri(),e=Ft.identifierPrefix;if(pt){var t=wi,i=Ei;t=(i&~(1<<32-Jn(i)-1)).toString(32)+t,e=":"+e+"R"+t,t=sa++,0<t&&(e+="H"+t.toString(32)),e+=":"}else t=$y++,e=":"+e+"r"+t.toString(32)+":";return n.memoizedState=e},unstable_isNewReconciler:!1},Jy={readContext:Bn,useCallback:lv,useContext:Bn,useEffect:Uf,useImperativeHandle:av,useInsertionEffect:rv,useLayoutEffect:sv,useMemo:cv,useReducer:Qc,useRef:iv,useState:function(){return Qc(oa)},useDebugValue:Ff,useDeferredValue:function(n){var e=Vn();return uv(e,Ct.memoizedState,n)},useTransition:function(){var n=Qc(oa)[0],e=Vn().memoizedState;return[n,e]},useMutableSource:K0,useSyncExternalStore:Z0,useId:dv,unstable_isNewReconciler:!1},Qy={readContext:Bn,useCallback:lv,useContext:Bn,useEffect:Uf,useImperativeHandle:av,useInsertionEffect:rv,useLayoutEffect:sv,useMemo:cv,useReducer:eu,useRef:iv,useState:function(){return eu(oa)},useDebugValue:Ff,useDeferredValue:function(n){var e=Vn();return Ct===null?e.memoizedState=n:uv(e,Ct.memoizedState,n)},useTransition:function(){var n=eu(oa)[0],e=Vn().memoizedState;return[n,e]},useMutableSource:K0,useSyncExternalStore:Z0,useId:dv,unstable_isNewReconciler:!1};function $n(n,e){if(n&&n.defaultProps){e=_t({},e),n=n.defaultProps;for(var t in n)e[t]===void 0&&(e[t]=n[t]);return e}return e}function Rd(n,e,t,i){e=n.memoizedState,t=t(i,e),t=t==null?e:_t({},e,t),n.memoizedState=t,n.lanes===0&&(n.updateQueue.baseState=t)}var mc={isMounted:function(n){return(n=n._reactInternals)?jr(n)===n:!1},enqueueSetState:function(n,e,t){n=n._reactInternals;var i=sn(),r=or(n),s=Ai(i,r);s.payload=e,t!=null&&(s.callback=t),e=rr(n,s,r),e!==null&&(Qn(e,n,r,i),pl(e,n,r))},enqueueReplaceState:function(n,e,t){n=n._reactInternals;var i=sn(),r=or(n),s=Ai(i,r);s.tag=1,s.payload=e,t!=null&&(s.callback=t),e=rr(n,s,r),e!==null&&(Qn(e,n,r,i),pl(e,n,r))},enqueueForceUpdate:function(n,e){n=n._reactInternals;var t=sn(),i=or(n),r=Ai(t,i);r.tag=2,e!=null&&(r.callback=e),e=rr(n,r,i),e!==null&&(Qn(e,n,i,t),pl(e,n,i))}};function sp(n,e,t,i,r,s,o){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(i,s,o):e.prototype&&e.prototype.isPureReactComponent?!Qo(t,i)||!Qo(r,s):!0}function mv(n,e,t){var i=!1,r=fr,s=e.contextType;return typeof s=="object"&&s!==null?s=Bn(s):(r=dn(e)?kr:en.current,i=e.contextTypes,s=(i=i!=null)?Vs(n,r):fr),e=new e(t,s),n.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=mc,n.stateNode=e,e._reactInternals=n,i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=r,n.__reactInternalMemoizedMaskedChildContext=s),e}function op(n,e,t,i){n=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(t,i),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(t,i),e.state!==n&&mc.enqueueReplaceState(e,e.state,null)}function Pd(n,e,t,i){var r=n.stateNode;r.props=t,r.state=n.memoizedState,r.refs={},Cf(n);var s=e.contextType;typeof s=="object"&&s!==null?r.context=Bn(s):(s=dn(e)?kr:en.current,r.context=Vs(n,s)),r.state=n.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(Rd(n,e,s,t),r.state=n.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(e=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),e!==r.state&&mc.enqueueReplaceState(r,r.state,null),zl(n,t,r,i),r.state=n.memoizedState),typeof r.componentDidMount=="function"&&(n.flags|=4194308)}function Ws(n,e){try{var t="",i=e;do t+=bx(i),i=i.return;while(i);var r=t}catch(s){r=`
Error generating stack: `+s.message+`
`+s.stack}return{value:n,source:e,stack:r,digest:null}}function tu(n,e,t){return{value:n,source:null,stack:t??null,digest:e??null}}function Nd(n,e){try{console.error(e.value)}catch(t){setTimeout(function(){throw t})}}var eM=typeof WeakMap=="function"?WeakMap:Map;function gv(n,e,t){t=Ai(-1,t),t.tag=3,t.payload={element:null};var i=e.value;return t.callback=function(){jl||(jl=!0,Vd=i),Nd(n,e)},t}function vv(n,e,t){t=Ai(-1,t),t.tag=3;var i=n.type.getDerivedStateFromError;if(typeof i=="function"){var r=e.value;t.payload=function(){return i(r)},t.callback=function(){Nd(n,e)}}var s=n.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(t.callback=function(){Nd(n,e),typeof i!="function"&&(sr===null?sr=new Set([this]):sr.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),t}function ap(n,e,t){var i=n.pingCache;if(i===null){i=n.pingCache=new eM;var r=new Set;i.set(e,r)}else r=i.get(e),r===void 0&&(r=new Set,i.set(e,r));r.has(t)||(r.add(t),n=pM.bind(null,n,e,t),e.then(n,n))}function lp(n){do{var e;if((e=n.tag===13)&&(e=n.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return n;n=n.return}while(n!==null);return null}function cp(n,e,t,i,r){return n.mode&1?(n.flags|=65536,n.lanes=r,n):(n===e?n.flags|=65536:(n.flags|=128,t.flags|=131072,t.flags&=-52805,t.tag===1&&(t.alternate===null?t.tag=17:(e=Ai(-1,1),e.tag=2,rr(t,e,1))),t.lanes|=1),n)}var tM=Li.ReactCurrentOwner,cn=!1;function rn(n,e,t,i){e.child=n===null?X0(e,null,t,i):Gs(e,n.child,t,i)}function up(n,e,t,i,r){t=t.render;var s=e.ref;return Ds(e,r),i=If(n,e,t,i,s,r),t=Df(),n!==null&&!cn?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,Ni(n,e,r)):(pt&&t&&Mf(e),e.flags|=1,rn(n,e,i,r),e.child)}function dp(n,e,t,i,r){if(n===null){var s=t.type;return typeof s=="function"&&!jf(s)&&s.defaultProps===void 0&&t.compare===null&&t.defaultProps===void 0?(e.tag=15,e.type=s,_v(n,e,s,i,r)):(n=yl(t.type,null,i,e,e.mode,r),n.ref=e.ref,n.return=e,e.child=n)}if(s=n.child,!(n.lanes&r)){var o=s.memoizedProps;if(t=t.compare,t=t!==null?t:Qo,t(o,i)&&n.ref===e.ref)return Ni(n,e,r)}return e.flags|=1,n=ar(s,i),n.ref=e.ref,n.return=e,e.child=n}function _v(n,e,t,i,r){if(n!==null){var s=n.memoizedProps;if(Qo(s,i)&&n.ref===e.ref)if(cn=!1,e.pendingProps=i=s,(n.lanes&r)!==0)n.flags&131072&&(cn=!0);else return e.lanes=n.lanes,Ni(n,e,r)}return Ld(n,e,t,i,r)}function xv(n,e,t){var i=e.pendingProps,r=i.children,s=n!==null?n.memoizedState:null;if(i.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},ct(bs,vn),vn|=t;else{if(!(t&1073741824))return n=s!==null?s.baseLanes|t:t,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:n,cachePool:null,transitions:null},e.updateQueue=null,ct(bs,vn),vn|=n,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},i=s!==null?s.baseLanes:t,ct(bs,vn),vn|=i}else s!==null?(i=s.baseLanes|t,e.memoizedState=null):i=t,ct(bs,vn),vn|=i;return rn(n,e,r,t),e.child}function yv(n,e){var t=e.ref;(n===null&&t!==null||n!==null&&n.ref!==t)&&(e.flags|=512,e.flags|=2097152)}function Ld(n,e,t,i,r){var s=dn(t)?kr:en.current;return s=Vs(e,s),Ds(e,r),t=If(n,e,t,i,s,r),i=Df(),n!==null&&!cn?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,Ni(n,e,r)):(pt&&i&&Mf(e),e.flags|=1,rn(n,e,t,r),e.child)}function fp(n,e,t,i,r){if(dn(t)){var s=!0;Dl(e)}else s=!1;if(Ds(e,r),e.stateNode===null)vl(n,e),mv(e,t,i),Pd(e,t,i,r),i=!0;else if(n===null){var o=e.stateNode,a=e.memoizedProps;o.props=a;var l=o.context,c=t.contextType;typeof c=="object"&&c!==null?c=Bn(c):(c=dn(t)?kr:en.current,c=Vs(e,c));var d=t.getDerivedStateFromProps,f=typeof d=="function"||typeof o.getSnapshotBeforeUpdate=="function";f||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==i||l!==c)&&op(e,o,i,c),Wi=!1;var h=e.memoizedState;o.state=h,zl(e,i,o,r),l=e.memoizedState,a!==i||h!==l||un.current||Wi?(typeof d=="function"&&(Rd(e,t,d,i),l=e.memoizedState),(a=Wi||sp(e,t,a,i,h,l,c))?(f||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=i,e.memoizedState=l),o.props=i,o.state=l,o.context=c,i=a):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),i=!1)}else{o=e.stateNode,Y0(n,e),a=e.memoizedProps,c=e.type===e.elementType?a:$n(e.type,a),o.props=c,f=e.pendingProps,h=o.context,l=t.contextType,typeof l=="object"&&l!==null?l=Bn(l):(l=dn(t)?kr:en.current,l=Vs(e,l));var p=t.getDerivedStateFromProps;(d=typeof p=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==f||h!==l)&&op(e,o,i,l),Wi=!1,h=e.memoizedState,o.state=h,zl(e,i,o,r);var g=e.memoizedState;a!==f||h!==g||un.current||Wi?(typeof p=="function"&&(Rd(e,t,p,i),g=e.memoizedState),(c=Wi||sp(e,t,c,i,h,g,l)||!1)?(d||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(i,g,l),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(i,g,l)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||a===n.memoizedProps&&h===n.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===n.memoizedProps&&h===n.memoizedState||(e.flags|=1024),e.memoizedProps=i,e.memoizedState=g),o.props=i,o.state=g,o.context=l,i=c):(typeof o.componentDidUpdate!="function"||a===n.memoizedProps&&h===n.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===n.memoizedProps&&h===n.memoizedState||(e.flags|=1024),i=!1)}return Id(n,e,t,i,s,r)}function Id(n,e,t,i,r,s){yv(n,e);var o=(e.flags&128)!==0;if(!i&&!o)return r&&Zh(e,t,!1),Ni(n,e,s);i=e.stateNode,tM.current=e;var a=o&&typeof t.getDerivedStateFromError!="function"?null:i.render();return e.flags|=1,n!==null&&o?(e.child=Gs(e,n.child,null,s),e.child=Gs(e,null,a,s)):rn(n,e,a,s),e.memoizedState=i.state,r&&Zh(e,t,!0),e.child}function Mv(n){var e=n.stateNode;e.pendingContext?Kh(n,e.pendingContext,e.pendingContext!==e.context):e.context&&Kh(n,e.context,!1),Rf(n,e.containerInfo)}function hp(n,e,t,i,r){return Hs(),Ef(r),e.flags|=256,rn(n,e,t,i),e.child}var Dd={dehydrated:null,treeContext:null,retryLane:0};function Ud(n){return{baseLanes:n,cachePool:null,transitions:null}}function Sv(n,e,t){var i=e.pendingProps,r=gt.current,s=!1,o=(e.flags&128)!==0,a;if((a=o)||(a=n!==null&&n.memoizedState===null?!1:(r&2)!==0),a?(s=!0,e.flags&=-129):(n===null||n.memoizedState!==null)&&(r|=1),ct(gt,r&1),n===null)return bd(e),n=e.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?(e.mode&1?n.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=i.children,n=i.fallback,s?(i=e.mode,s=e.child,o={mode:"hidden",children:o},!(i&1)&&s!==null?(s.childLanes=0,s.pendingProps=o):s=_c(o,i,0,null),n=Or(n,i,t,null),s.return=e,n.return=e,s.sibling=n,e.child=s,e.child.memoizedState=Ud(t),e.memoizedState=Dd,n):Of(e,o));if(r=n.memoizedState,r!==null&&(a=r.dehydrated,a!==null))return nM(n,e,o,i,a,r,t);if(s){s=i.fallback,o=e.mode,r=n.child,a=r.sibling;var l={mode:"hidden",children:i.children};return!(o&1)&&e.child!==r?(i=e.child,i.childLanes=0,i.pendingProps=l,e.deletions=null):(i=ar(r,l),i.subtreeFlags=r.subtreeFlags&14680064),a!==null?s=ar(a,s):(s=Or(s,o,t,null),s.flags|=2),s.return=e,i.return=e,i.sibling=s,e.child=i,i=s,s=e.child,o=n.child.memoizedState,o=o===null?Ud(t):{baseLanes:o.baseLanes|t,cachePool:null,transitions:o.transitions},s.memoizedState=o,s.childLanes=n.childLanes&~t,e.memoizedState=Dd,i}return s=n.child,n=s.sibling,i=ar(s,{mode:"visible",children:i.children}),!(e.mode&1)&&(i.lanes=t),i.return=e,i.sibling=null,n!==null&&(t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)),e.child=i,e.memoizedState=null,i}function Of(n,e){return e=_c({mode:"visible",children:e},n.mode,0,null),e.return=n,n.child=e}function Ua(n,e,t,i){return i!==null&&Ef(i),Gs(e,n.child,null,t),n=Of(e,e.pendingProps.children),n.flags|=2,e.memoizedState=null,n}function nM(n,e,t,i,r,s,o){if(t)return e.flags&256?(e.flags&=-257,i=tu(Error(le(422))),Ua(n,e,o,i)):e.memoizedState!==null?(e.child=n.child,e.flags|=128,null):(s=i.fallback,r=e.mode,i=_c({mode:"visible",children:i.children},r,0,null),s=Or(s,r,o,null),s.flags|=2,i.return=e,s.return=e,i.sibling=s,e.child=i,e.mode&1&&Gs(e,n.child,null,o),e.child.memoizedState=Ud(o),e.memoizedState=Dd,s);if(!(e.mode&1))return Ua(n,e,o,null);if(r.data==="$!"){if(i=r.nextSibling&&r.nextSibling.dataset,i)var a=i.dgst;return i=a,s=Error(le(419)),i=tu(s,i,void 0),Ua(n,e,o,i)}if(a=(o&n.childLanes)!==0,cn||a){if(i=Ft,i!==null){switch(o&-o){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=r&(i.suspendedLanes|o)?0:r,r!==0&&r!==s.retryLane&&(s.retryLane=r,Pi(n,r),Qn(i,n,r,-1))}return Gf(),i=tu(Error(le(421))),Ua(n,e,o,i)}return r.data==="$?"?(e.flags|=128,e.child=n.child,e=mM.bind(null,n),r._reactRetry=e,null):(n=s.treeContext,Mn=ir(r.nextSibling),wn=e,pt=!0,qn=null,n!==null&&(Ln[In++]=Ei,Ln[In++]=wi,Ln[In++]=zr,Ei=n.id,wi=n.overflow,zr=e),e=Of(e,i.children),e.flags|=4096,e)}function pp(n,e,t){n.lanes|=e;var i=n.alternate;i!==null&&(i.lanes|=e),Cd(n.return,e,t)}function nu(n,e,t,i,r){var s=n.memoizedState;s===null?n.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:i,tail:t,tailMode:r}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=i,s.tail=t,s.tailMode=r)}function Ev(n,e,t){var i=e.pendingProps,r=i.revealOrder,s=i.tail;if(rn(n,e,i.children,t),i=gt.current,i&2)i=i&1|2,e.flags|=128;else{if(n!==null&&n.flags&128)e:for(n=e.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&pp(n,t,e);else if(n.tag===19)pp(n,t,e);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break e;for(;n.sibling===null;){if(n.return===null||n.return===e)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}i&=1}if(ct(gt,i),!(e.mode&1))e.memoizedState=null;else switch(r){case"forwards":for(t=e.child,r=null;t!==null;)n=t.alternate,n!==null&&Bl(n)===null&&(r=t),t=t.sibling;t=r,t===null?(r=e.child,e.child=null):(r=t.sibling,t.sibling=null),nu(e,!1,r,t,s);break;case"backwards":for(t=null,r=e.child,e.child=null;r!==null;){if(n=r.alternate,n!==null&&Bl(n)===null){e.child=r;break}n=r.sibling,r.sibling=t,t=r,r=n}nu(e,!0,t,null,s);break;case"together":nu(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function vl(n,e){!(e.mode&1)&&n!==null&&(n.alternate=null,e.alternate=null,e.flags|=2)}function Ni(n,e,t){if(n!==null&&(e.dependencies=n.dependencies),Vr|=e.lanes,!(t&e.childLanes))return null;if(n!==null&&e.child!==n.child)throw Error(le(153));if(e.child!==null){for(n=e.child,t=ar(n,n.pendingProps),e.child=t,t.return=e;n.sibling!==null;)n=n.sibling,t=t.sibling=ar(n,n.pendingProps),t.return=e;t.sibling=null}return e.child}function iM(n,e,t){switch(e.tag){case 3:Mv(e),Hs();break;case 5:q0(e);break;case 1:dn(e.type)&&Dl(e);break;case 4:Rf(e,e.stateNode.containerInfo);break;case 10:var i=e.type._context,r=e.memoizedProps.value;ct(Ol,i._currentValue),i._currentValue=r;break;case 13:if(i=e.memoizedState,i!==null)return i.dehydrated!==null?(ct(gt,gt.current&1),e.flags|=128,null):t&e.child.childLanes?Sv(n,e,t):(ct(gt,gt.current&1),n=Ni(n,e,t),n!==null?n.sibling:null);ct(gt,gt.current&1);break;case 19:if(i=(t&e.childLanes)!==0,n.flags&128){if(i)return Ev(n,e,t);e.flags|=128}if(r=e.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),ct(gt,gt.current),i)break;return null;case 22:case 23:return e.lanes=0,xv(n,e,t)}return Ni(n,e,t)}var wv,Fd,Tv,Av;wv=function(n,e){for(var t=e.child;t!==null;){if(t.tag===5||t.tag===6)n.appendChild(t.stateNode);else if(t.tag!==4&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return;t=t.return}t.sibling.return=t.return,t=t.sibling}};Fd=function(){};Tv=function(n,e,t,i){var r=n.memoizedProps;if(r!==i){n=e.stateNode,Ur(ci.current);var s=null;switch(t){case"input":r=rd(n,r),i=rd(n,i),s=[];break;case"select":r=_t({},r,{value:void 0}),i=_t({},i,{value:void 0}),s=[];break;case"textarea":r=ad(n,r),i=ad(n,i),s=[];break;default:typeof r.onClick!="function"&&typeof i.onClick=="function"&&(n.onclick=Ll)}cd(t,i);var o;t=null;for(c in r)if(!i.hasOwnProperty(c)&&r.hasOwnProperty(c)&&r[c]!=null)if(c==="style"){var a=r[c];for(o in a)a.hasOwnProperty(o)&&(t||(t={}),t[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Xo.hasOwnProperty(c)?s||(s=[]):(s=s||[]).push(c,null));for(c in i){var l=i[c];if(a=r!=null?r[c]:void 0,i.hasOwnProperty(c)&&l!==a&&(l!=null||a!=null))if(c==="style")if(a){for(o in a)!a.hasOwnProperty(o)||l&&l.hasOwnProperty(o)||(t||(t={}),t[o]="");for(o in l)l.hasOwnProperty(o)&&a[o]!==l[o]&&(t||(t={}),t[o]=l[o])}else t||(s||(s=[]),s.push(c,t)),t=l;else c==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,a=a?a.__html:void 0,l!=null&&a!==l&&(s=s||[]).push(c,l)):c==="children"?typeof l!="string"&&typeof l!="number"||(s=s||[]).push(c,""+l):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Xo.hasOwnProperty(c)?(l!=null&&c==="onScroll"&&dt("scroll",n),s||a===l||(s=[])):(s=s||[]).push(c,l))}t&&(s=s||[]).push("style",t);var c=s;(e.updateQueue=c)&&(e.flags|=4)}};Av=function(n,e,t,i){t!==i&&(e.flags|=4)};function vo(n,e){if(!pt)switch(n.tailMode){case"hidden":e=n.tail;for(var t=null;e!==null;)e.alternate!==null&&(t=e),e=e.sibling;t===null?n.tail=null:t.sibling=null;break;case"collapsed":t=n.tail;for(var i=null;t!==null;)t.alternate!==null&&(i=t),t=t.sibling;i===null?e||n.tail===null?n.tail=null:n.tail.sibling=null:i.sibling=null}}function $t(n){var e=n.alternate!==null&&n.alternate.child===n.child,t=0,i=0;if(e)for(var r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags&14680064,i|=r.flags&14680064,r.return=n,r=r.sibling;else for(r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags,i|=r.flags,r.return=n,r=r.sibling;return n.subtreeFlags|=i,n.childLanes=t,e}function rM(n,e,t){var i=e.pendingProps;switch(Sf(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return $t(e),null;case 1:return dn(e.type)&&Il(),$t(e),null;case 3:return i=e.stateNode,js(),ft(un),ft(en),Nf(),i.pendingContext&&(i.context=i.pendingContext,i.pendingContext=null),(n===null||n.child===null)&&(Ia(e)?e.flags|=4:n===null||n.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,qn!==null&&(jd(qn),qn=null))),Fd(n,e),$t(e),null;case 5:Pf(e);var r=Ur(ra.current);if(t=e.type,n!==null&&e.stateNode!=null)Tv(n,e,t,i,r),n.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!i){if(e.stateNode===null)throw Error(le(166));return $t(e),null}if(n=Ur(ci.current),Ia(e)){i=e.stateNode,t=e.type;var s=e.memoizedProps;switch(i[oi]=e,i[na]=s,n=(e.mode&1)!==0,t){case"dialog":dt("cancel",i),dt("close",i);break;case"iframe":case"object":case"embed":dt("load",i);break;case"video":case"audio":for(r=0;r<Po.length;r++)dt(Po[r],i);break;case"source":dt("error",i);break;case"img":case"image":case"link":dt("error",i),dt("load",i);break;case"details":dt("toggle",i);break;case"input":Eh(i,s),dt("invalid",i);break;case"select":i._wrapperState={wasMultiple:!!s.multiple},dt("invalid",i);break;case"textarea":Th(i,s),dt("invalid",i)}cd(t,s),r=null;for(var o in s)if(s.hasOwnProperty(o)){var a=s[o];o==="children"?typeof a=="string"?i.textContent!==a&&(s.suppressHydrationWarning!==!0&&La(i.textContent,a,n),r=["children",a]):typeof a=="number"&&i.textContent!==""+a&&(s.suppressHydrationWarning!==!0&&La(i.textContent,a,n),r=["children",""+a]):Xo.hasOwnProperty(o)&&a!=null&&o==="onScroll"&&dt("scroll",i)}switch(t){case"input":wa(i),wh(i,s,!0);break;case"textarea":wa(i),Ah(i);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(i.onclick=Ll)}i=r,e.updateQueue=i,i!==null&&(e.flags|=4)}else{o=r.nodeType===9?r:r.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=e0(t)),n==="http://www.w3.org/1999/xhtml"?t==="script"?(n=o.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof i.is=="string"?n=o.createElement(t,{is:i.is}):(n=o.createElement(t),t==="select"&&(o=n,i.multiple?o.multiple=!0:i.size&&(o.size=i.size))):n=o.createElementNS(n,t),n[oi]=e,n[na]=i,wv(n,e,!1,!1),e.stateNode=n;e:{switch(o=ud(t,i),t){case"dialog":dt("cancel",n),dt("close",n),r=i;break;case"iframe":case"object":case"embed":dt("load",n),r=i;break;case"video":case"audio":for(r=0;r<Po.length;r++)dt(Po[r],n);r=i;break;case"source":dt("error",n),r=i;break;case"img":case"image":case"link":dt("error",n),dt("load",n),r=i;break;case"details":dt("toggle",n),r=i;break;case"input":Eh(n,i),r=rd(n,i),dt("invalid",n);break;case"option":r=i;break;case"select":n._wrapperState={wasMultiple:!!i.multiple},r=_t({},i,{value:void 0}),dt("invalid",n);break;case"textarea":Th(n,i),r=ad(n,i),dt("invalid",n);break;default:r=i}cd(t,r),a=r;for(s in a)if(a.hasOwnProperty(s)){var l=a[s];s==="style"?i0(n,l):s==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,l!=null&&t0(n,l)):s==="children"?typeof l=="string"?(t!=="textarea"||l!=="")&&$o(n,l):typeof l=="number"&&$o(n,""+l):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(Xo.hasOwnProperty(s)?l!=null&&s==="onScroll"&&dt("scroll",n):l!=null&&af(n,s,l,o))}switch(t){case"input":wa(n),wh(n,i,!1);break;case"textarea":wa(n),Ah(n);break;case"option":i.value!=null&&n.setAttribute("value",""+dr(i.value));break;case"select":n.multiple=!!i.multiple,s=i.value,s!=null?Ps(n,!!i.multiple,s,!1):i.defaultValue!=null&&Ps(n,!!i.multiple,i.defaultValue,!0);break;default:typeof r.onClick=="function"&&(n.onclick=Ll)}switch(t){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break e;case"img":i=!0;break e;default:i=!1}}i&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return $t(e),null;case 6:if(n&&e.stateNode!=null)Av(n,e,n.memoizedProps,i);else{if(typeof i!="string"&&e.stateNode===null)throw Error(le(166));if(t=Ur(ra.current),Ur(ci.current),Ia(e)){if(i=e.stateNode,t=e.memoizedProps,i[oi]=e,(s=i.nodeValue!==t)&&(n=wn,n!==null))switch(n.tag){case 3:La(i.nodeValue,t,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&La(i.nodeValue,t,(n.mode&1)!==0)}s&&(e.flags|=4)}else i=(t.nodeType===9?t:t.ownerDocument).createTextNode(i),i[oi]=e,e.stateNode=i}return $t(e),null;case 13:if(ft(gt),i=e.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(pt&&Mn!==null&&e.mode&1&&!(e.flags&128))j0(),Hs(),e.flags|=98560,s=!1;else if(s=Ia(e),i!==null&&i.dehydrated!==null){if(n===null){if(!s)throw Error(le(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(le(317));s[oi]=e}else Hs(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;$t(e),s=!1}else qn!==null&&(jd(qn),qn=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=t,e):(i=i!==null,i!==(n!==null&&n.memoizedState!==null)&&i&&(e.child.flags|=8192,e.mode&1&&(n===null||gt.current&1?Rt===0&&(Rt=3):Gf())),e.updateQueue!==null&&(e.flags|=4),$t(e),null);case 4:return js(),Fd(n,e),n===null&&ea(e.stateNode.containerInfo),$t(e),null;case 10:return Af(e.type._context),$t(e),null;case 17:return dn(e.type)&&Il(),$t(e),null;case 19:if(ft(gt),s=e.memoizedState,s===null)return $t(e),null;if(i=(e.flags&128)!==0,o=s.rendering,o===null)if(i)vo(s,!1);else{if(Rt!==0||n!==null&&n.flags&128)for(n=e.child;n!==null;){if(o=Bl(n),o!==null){for(e.flags|=128,vo(s,!1),i=o.updateQueue,i!==null&&(e.updateQueue=i,e.flags|=4),e.subtreeFlags=0,i=t,t=e.child;t!==null;)s=t,n=i,s.flags&=14680066,o=s.alternate,o===null?(s.childLanes=0,s.lanes=n,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=o.childLanes,s.lanes=o.lanes,s.child=o.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=o.memoizedProps,s.memoizedState=o.memoizedState,s.updateQueue=o.updateQueue,s.type=o.type,n=o.dependencies,s.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),t=t.sibling;return ct(gt,gt.current&1|2),e.child}n=n.sibling}s.tail!==null&&St()>Xs&&(e.flags|=128,i=!0,vo(s,!1),e.lanes=4194304)}else{if(!i)if(n=Bl(o),n!==null){if(e.flags|=128,i=!0,t=n.updateQueue,t!==null&&(e.updateQueue=t,e.flags|=4),vo(s,!0),s.tail===null&&s.tailMode==="hidden"&&!o.alternate&&!pt)return $t(e),null}else 2*St()-s.renderingStartTime>Xs&&t!==1073741824&&(e.flags|=128,i=!0,vo(s,!1),e.lanes=4194304);s.isBackwards?(o.sibling=e.child,e.child=o):(t=s.last,t!==null?t.sibling=o:e.child=o,s.last=o)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=St(),e.sibling=null,t=gt.current,ct(gt,i?t&1|2:t&1),e):($t(e),null);case 22:case 23:return Hf(),i=e.memoizedState!==null,n!==null&&n.memoizedState!==null!==i&&(e.flags|=8192),i&&e.mode&1?vn&1073741824&&($t(e),e.subtreeFlags&6&&(e.flags|=8192)):$t(e),null;case 24:return null;case 25:return null}throw Error(le(156,e.tag))}function sM(n,e){switch(Sf(e),e.tag){case 1:return dn(e.type)&&Il(),n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 3:return js(),ft(un),ft(en),Nf(),n=e.flags,n&65536&&!(n&128)?(e.flags=n&-65537|128,e):null;case 5:return Pf(e),null;case 13:if(ft(gt),n=e.memoizedState,n!==null&&n.dehydrated!==null){if(e.alternate===null)throw Error(le(340));Hs()}return n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 19:return ft(gt),null;case 4:return js(),null;case 10:return Af(e.type._context),null;case 22:case 23:return Hf(),null;case 24:return null;default:return null}}var Fa=!1,Kt=!1,oM=typeof WeakSet=="function"?WeakSet:Set,_e=null;function As(n,e){var t=n.ref;if(t!==null)if(typeof t=="function")try{t(null)}catch(i){Mt(n,e,i)}else t.current=null}function Od(n,e,t){try{t()}catch(i){Mt(n,e,i)}}var mp=!1;function aM(n,e){if(yd=Rl,n=N0(),yf(n)){if("selectionStart"in n)var t={start:n.selectionStart,end:n.selectionEnd};else e:{t=(t=n.ownerDocument)&&t.defaultView||window;var i=t.getSelection&&t.getSelection();if(i&&i.rangeCount!==0){t=i.anchorNode;var r=i.anchorOffset,s=i.focusNode;i=i.focusOffset;try{t.nodeType,s.nodeType}catch{t=null;break e}var o=0,a=-1,l=-1,c=0,d=0,f=n,h=null;t:for(;;){for(var p;f!==t||r!==0&&f.nodeType!==3||(a=o+r),f!==s||i!==0&&f.nodeType!==3||(l=o+i),f.nodeType===3&&(o+=f.nodeValue.length),(p=f.firstChild)!==null;)h=f,f=p;for(;;){if(f===n)break t;if(h===t&&++c===r&&(a=o),h===s&&++d===i&&(l=o),(p=f.nextSibling)!==null)break;f=h,h=f.parentNode}f=p}t=a===-1||l===-1?null:{start:a,end:l}}else t=null}t=t||{start:0,end:0}}else t=null;for(Md={focusedElem:n,selectionRange:t},Rl=!1,_e=e;_e!==null;)if(e=_e,n=e.child,(e.subtreeFlags&1028)!==0&&n!==null)n.return=e,_e=n;else for(;_e!==null;){e=_e;try{var g=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(g!==null){var y=g.memoizedProps,m=g.memoizedState,u=e.stateNode,_=u.getSnapshotBeforeUpdate(e.elementType===e.type?y:$n(e.type,y),m);u.__reactInternalSnapshotBeforeUpdate=_}break;case 3:var v=e.stateNode.containerInfo;v.nodeType===1?v.textContent="":v.nodeType===9&&v.documentElement&&v.removeChild(v.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(le(163))}}catch(M){Mt(e,e.return,M)}if(n=e.sibling,n!==null){n.return=e.return,_e=n;break}_e=e.return}return g=mp,mp=!1,g}function Bo(n,e,t){var i=e.updateQueue;if(i=i!==null?i.lastEffect:null,i!==null){var r=i=i.next;do{if((r.tag&n)===n){var s=r.destroy;r.destroy=void 0,s!==void 0&&Od(e,t,s)}r=r.next}while(r!==i)}}function gc(n,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var t=e=e.next;do{if((t.tag&n)===n){var i=t.create;t.destroy=i()}t=t.next}while(t!==e)}}function kd(n){var e=n.ref;if(e!==null){var t=n.stateNode;switch(n.tag){case 5:n=t;break;default:n=t}typeof e=="function"?e(n):e.current=n}}function bv(n){var e=n.alternate;e!==null&&(n.alternate=null,bv(e)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(e=n.stateNode,e!==null&&(delete e[oi],delete e[na],delete e[wd],delete e[Gy],delete e[jy])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function Cv(n){return n.tag===5||n.tag===3||n.tag===4}function gp(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||Cv(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function zd(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.nodeType===8?t.parentNode.insertBefore(n,e):t.insertBefore(n,e):(t.nodeType===8?(e=t.parentNode,e.insertBefore(n,t)):(e=t,e.appendChild(n)),t=t._reactRootContainer,t!=null||e.onclick!==null||(e.onclick=Ll));else if(i!==4&&(n=n.child,n!==null))for(zd(n,e,t),n=n.sibling;n!==null;)zd(n,e,t),n=n.sibling}function Bd(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.insertBefore(n,e):t.appendChild(n);else if(i!==4&&(n=n.child,n!==null))for(Bd(n,e,t),n=n.sibling;n!==null;)Bd(n,e,t),n=n.sibling}var zt=null,Yn=!1;function Fi(n,e,t){for(t=t.child;t!==null;)Rv(n,e,t),t=t.sibling}function Rv(n,e,t){if(li&&typeof li.onCommitFiberUnmount=="function")try{li.onCommitFiberUnmount(lc,t)}catch{}switch(t.tag){case 5:Kt||As(t,e);case 6:var i=zt,r=Yn;zt=null,Fi(n,e,t),zt=i,Yn=r,zt!==null&&(Yn?(n=zt,t=t.stateNode,n.nodeType===8?n.parentNode.removeChild(t):n.removeChild(t)):zt.removeChild(t.stateNode));break;case 18:zt!==null&&(Yn?(n=zt,t=t.stateNode,n.nodeType===8?qc(n.parentNode,t):n.nodeType===1&&qc(n,t),Zo(n)):qc(zt,t.stateNode));break;case 4:i=zt,r=Yn,zt=t.stateNode.containerInfo,Yn=!0,Fi(n,e,t),zt=i,Yn=r;break;case 0:case 11:case 14:case 15:if(!Kt&&(i=t.updateQueue,i!==null&&(i=i.lastEffect,i!==null))){r=i=i.next;do{var s=r,o=s.destroy;s=s.tag,o!==void 0&&(s&2||s&4)&&Od(t,e,o),r=r.next}while(r!==i)}Fi(n,e,t);break;case 1:if(!Kt&&(As(t,e),i=t.stateNode,typeof i.componentWillUnmount=="function"))try{i.props=t.memoizedProps,i.state=t.memoizedState,i.componentWillUnmount()}catch(a){Mt(t,e,a)}Fi(n,e,t);break;case 21:Fi(n,e,t);break;case 22:t.mode&1?(Kt=(i=Kt)||t.memoizedState!==null,Fi(n,e,t),Kt=i):Fi(n,e,t);break;default:Fi(n,e,t)}}function vp(n){var e=n.updateQueue;if(e!==null){n.updateQueue=null;var t=n.stateNode;t===null&&(t=n.stateNode=new oM),e.forEach(function(i){var r=gM.bind(null,n,i);t.has(i)||(t.add(i),i.then(r,r))})}}function Hn(n,e){var t=e.deletions;if(t!==null)for(var i=0;i<t.length;i++){var r=t[i];try{var s=n,o=e,a=o;e:for(;a!==null;){switch(a.tag){case 5:zt=a.stateNode,Yn=!1;break e;case 3:zt=a.stateNode.containerInfo,Yn=!0;break e;case 4:zt=a.stateNode.containerInfo,Yn=!0;break e}a=a.return}if(zt===null)throw Error(le(160));Rv(s,o,r),zt=null,Yn=!1;var l=r.alternate;l!==null&&(l.return=null),r.return=null}catch(c){Mt(r,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)Pv(e,n),e=e.sibling}function Pv(n,e){var t=n.alternate,i=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Hn(e,n),ii(n),i&4){try{Bo(3,n,n.return),gc(3,n)}catch(y){Mt(n,n.return,y)}try{Bo(5,n,n.return)}catch(y){Mt(n,n.return,y)}}break;case 1:Hn(e,n),ii(n),i&512&&t!==null&&As(t,t.return);break;case 5:if(Hn(e,n),ii(n),i&512&&t!==null&&As(t,t.return),n.flags&32){var r=n.stateNode;try{$o(r,"")}catch(y){Mt(n,n.return,y)}}if(i&4&&(r=n.stateNode,r!=null)){var s=n.memoizedProps,o=t!==null?t.memoizedProps:s,a=n.type,l=n.updateQueue;if(n.updateQueue=null,l!==null)try{a==="input"&&s.type==="radio"&&s.name!=null&&Jg(r,s),ud(a,o);var c=ud(a,s);for(o=0;o<l.length;o+=2){var d=l[o],f=l[o+1];d==="style"?i0(r,f):d==="dangerouslySetInnerHTML"?t0(r,f):d==="children"?$o(r,f):af(r,d,f,c)}switch(a){case"input":sd(r,s);break;case"textarea":Qg(r,s);break;case"select":var h=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!s.multiple;var p=s.value;p!=null?Ps(r,!!s.multiple,p,!1):h!==!!s.multiple&&(s.defaultValue!=null?Ps(r,!!s.multiple,s.defaultValue,!0):Ps(r,!!s.multiple,s.multiple?[]:"",!1))}r[na]=s}catch(y){Mt(n,n.return,y)}}break;case 6:if(Hn(e,n),ii(n),i&4){if(n.stateNode===null)throw Error(le(162));r=n.stateNode,s=n.memoizedProps;try{r.nodeValue=s}catch(y){Mt(n,n.return,y)}}break;case 3:if(Hn(e,n),ii(n),i&4&&t!==null&&t.memoizedState.isDehydrated)try{Zo(e.containerInfo)}catch(y){Mt(n,n.return,y)}break;case 4:Hn(e,n),ii(n);break;case 13:Hn(e,n),ii(n),r=n.child,r.flags&8192&&(s=r.memoizedState!==null,r.stateNode.isHidden=s,!s||r.alternate!==null&&r.alternate.memoizedState!==null||(Bf=St())),i&4&&vp(n);break;case 22:if(d=t!==null&&t.memoizedState!==null,n.mode&1?(Kt=(c=Kt)||d,Hn(e,n),Kt=c):Hn(e,n),ii(n),i&8192){if(c=n.memoizedState!==null,(n.stateNode.isHidden=c)&&!d&&n.mode&1)for(_e=n,d=n.child;d!==null;){for(f=_e=d;_e!==null;){switch(h=_e,p=h.child,h.tag){case 0:case 11:case 14:case 15:Bo(4,h,h.return);break;case 1:As(h,h.return);var g=h.stateNode;if(typeof g.componentWillUnmount=="function"){i=h,t=h.return;try{e=i,g.props=e.memoizedProps,g.state=e.memoizedState,g.componentWillUnmount()}catch(y){Mt(i,t,y)}}break;case 5:As(h,h.return);break;case 22:if(h.memoizedState!==null){xp(f);continue}}p!==null?(p.return=h,_e=p):xp(f)}d=d.sibling}e:for(d=null,f=n;;){if(f.tag===5){if(d===null){d=f;try{r=f.stateNode,c?(s=r.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(a=f.stateNode,l=f.memoizedProps.style,o=l!=null&&l.hasOwnProperty("display")?l.display:null,a.style.display=n0("display",o))}catch(y){Mt(n,n.return,y)}}}else if(f.tag===6){if(d===null)try{f.stateNode.nodeValue=c?"":f.memoizedProps}catch(y){Mt(n,n.return,y)}}else if((f.tag!==22&&f.tag!==23||f.memoizedState===null||f===n)&&f.child!==null){f.child.return=f,f=f.child;continue}if(f===n)break e;for(;f.sibling===null;){if(f.return===null||f.return===n)break e;d===f&&(d=null),f=f.return}d===f&&(d=null),f.sibling.return=f.return,f=f.sibling}}break;case 19:Hn(e,n),ii(n),i&4&&vp(n);break;case 21:break;default:Hn(e,n),ii(n)}}function ii(n){var e=n.flags;if(e&2){try{e:{for(var t=n.return;t!==null;){if(Cv(t)){var i=t;break e}t=t.return}throw Error(le(160))}switch(i.tag){case 5:var r=i.stateNode;i.flags&32&&($o(r,""),i.flags&=-33);var s=gp(n);Bd(n,s,r);break;case 3:case 4:var o=i.stateNode.containerInfo,a=gp(n);zd(n,a,o);break;default:throw Error(le(161))}}catch(l){Mt(n,n.return,l)}n.flags&=-3}e&4096&&(n.flags&=-4097)}function lM(n,e,t){_e=n,Nv(n)}function Nv(n,e,t){for(var i=(n.mode&1)!==0;_e!==null;){var r=_e,s=r.child;if(r.tag===22&&i){var o=r.memoizedState!==null||Fa;if(!o){var a=r.alternate,l=a!==null&&a.memoizedState!==null||Kt;a=Fa;var c=Kt;if(Fa=o,(Kt=l)&&!c)for(_e=r;_e!==null;)o=_e,l=o.child,o.tag===22&&o.memoizedState!==null?yp(r):l!==null?(l.return=o,_e=l):yp(r);for(;s!==null;)_e=s,Nv(s),s=s.sibling;_e=r,Fa=a,Kt=c}_p(n)}else r.subtreeFlags&8772&&s!==null?(s.return=r,_e=s):_p(n)}}function _p(n){for(;_e!==null;){var e=_e;if(e.flags&8772){var t=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:Kt||gc(5,e);break;case 1:var i=e.stateNode;if(e.flags&4&&!Kt)if(t===null)i.componentDidMount();else{var r=e.elementType===e.type?t.memoizedProps:$n(e.type,t.memoizedProps);i.componentDidUpdate(r,t.memoizedState,i.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&np(e,s,i);break;case 3:var o=e.updateQueue;if(o!==null){if(t=null,e.child!==null)switch(e.child.tag){case 5:t=e.child.stateNode;break;case 1:t=e.child.stateNode}np(e,o,t)}break;case 5:var a=e.stateNode;if(t===null&&e.flags&4){t=a;var l=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":l.autoFocus&&t.focus();break;case"img":l.src&&(t.src=l.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var d=c.memoizedState;if(d!==null){var f=d.dehydrated;f!==null&&Zo(f)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(le(163))}Kt||e.flags&512&&kd(e)}catch(h){Mt(e,e.return,h)}}if(e===n){_e=null;break}if(t=e.sibling,t!==null){t.return=e.return,_e=t;break}_e=e.return}}function xp(n){for(;_e!==null;){var e=_e;if(e===n){_e=null;break}var t=e.sibling;if(t!==null){t.return=e.return,_e=t;break}_e=e.return}}function yp(n){for(;_e!==null;){var e=_e;try{switch(e.tag){case 0:case 11:case 15:var t=e.return;try{gc(4,e)}catch(l){Mt(e,t,l)}break;case 1:var i=e.stateNode;if(typeof i.componentDidMount=="function"){var r=e.return;try{i.componentDidMount()}catch(l){Mt(e,r,l)}}var s=e.return;try{kd(e)}catch(l){Mt(e,s,l)}break;case 5:var o=e.return;try{kd(e)}catch(l){Mt(e,o,l)}}}catch(l){Mt(e,e.return,l)}if(e===n){_e=null;break}var a=e.sibling;if(a!==null){a.return=e.return,_e=a;break}_e=e.return}}var cM=Math.ceil,Gl=Li.ReactCurrentDispatcher,kf=Li.ReactCurrentOwner,kn=Li.ReactCurrentBatchConfig,Je=0,Ft=null,bt=null,Ht=0,vn=0,bs=vr(0),Rt=0,la=null,Vr=0,vc=0,zf=0,Vo=null,ln=null,Bf=0,Xs=1/0,yi=null,jl=!1,Vd=null,sr=null,Oa=!1,Ki=null,Wl=0,Ho=0,Hd=null,_l=-1,xl=0;function sn(){return Je&6?St():_l!==-1?_l:_l=St()}function or(n){return n.mode&1?Je&2&&Ht!==0?Ht&-Ht:Xy.transition!==null?(xl===0&&(xl=m0()),xl):(n=ot,n!==0||(n=window.event,n=n===void 0?16:S0(n.type)),n):1}function Qn(n,e,t,i){if(50<Ho)throw Ho=0,Hd=null,Error(le(185));pa(n,t,i),(!(Je&2)||n!==Ft)&&(n===Ft&&(!(Je&2)&&(vc|=t),Rt===4&&Yi(n,Ht)),fn(n,i),t===1&&Je===0&&!(e.mode&1)&&(Xs=St()+500,hc&&_r()))}function fn(n,e){var t=n.callbackNode;Xx(n,e);var i=Cl(n,n===Ft?Ht:0);if(i===0)t!==null&&Rh(t),n.callbackNode=null,n.callbackPriority=0;else if(e=i&-i,n.callbackPriority!==e){if(t!=null&&Rh(t),e===1)n.tag===0?Wy(Mp.bind(null,n)):V0(Mp.bind(null,n)),Vy(function(){!(Je&6)&&_r()}),t=null;else{switch(g0(i)){case 1:t=ff;break;case 4:t=h0;break;case 16:t=bl;break;case 536870912:t=p0;break;default:t=bl}t=zv(t,Lv.bind(null,n))}n.callbackPriority=e,n.callbackNode=t}}function Lv(n,e){if(_l=-1,xl=0,Je&6)throw Error(le(327));var t=n.callbackNode;if(Us()&&n.callbackNode!==t)return null;var i=Cl(n,n===Ft?Ht:0);if(i===0)return null;if(i&30||i&n.expiredLanes||e)e=Xl(n,i);else{e=i;var r=Je;Je|=2;var s=Dv();(Ft!==n||Ht!==e)&&(yi=null,Xs=St()+500,Fr(n,e));do try{fM();break}catch(a){Iv(n,a)}while(!0);Tf(),Gl.current=s,Je=r,bt!==null?e=0:(Ft=null,Ht=0,e=Rt)}if(e!==0){if(e===2&&(r=md(n),r!==0&&(i=r,e=Gd(n,r))),e===1)throw t=la,Fr(n,0),Yi(n,i),fn(n,St()),t;if(e===6)Yi(n,i);else{if(r=n.current.alternate,!(i&30)&&!uM(r)&&(e=Xl(n,i),e===2&&(s=md(n),s!==0&&(i=s,e=Gd(n,s))),e===1))throw t=la,Fr(n,0),Yi(n,i),fn(n,St()),t;switch(n.finishedWork=r,n.finishedLanes=i,e){case 0:case 1:throw Error(le(345));case 2:Cr(n,ln,yi);break;case 3:if(Yi(n,i),(i&130023424)===i&&(e=Bf+500-St(),10<e)){if(Cl(n,0)!==0)break;if(r=n.suspendedLanes,(r&i)!==i){sn(),n.pingedLanes|=n.suspendedLanes&r;break}n.timeoutHandle=Ed(Cr.bind(null,n,ln,yi),e);break}Cr(n,ln,yi);break;case 4:if(Yi(n,i),(i&4194240)===i)break;for(e=n.eventTimes,r=-1;0<i;){var o=31-Jn(i);s=1<<o,o=e[o],o>r&&(r=o),i&=~s}if(i=r,i=St()-i,i=(120>i?120:480>i?480:1080>i?1080:1920>i?1920:3e3>i?3e3:4320>i?4320:1960*cM(i/1960))-i,10<i){n.timeoutHandle=Ed(Cr.bind(null,n,ln,yi),i);break}Cr(n,ln,yi);break;case 5:Cr(n,ln,yi);break;default:throw Error(le(329))}}}return fn(n,St()),n.callbackNode===t?Lv.bind(null,n):null}function Gd(n,e){var t=Vo;return n.current.memoizedState.isDehydrated&&(Fr(n,e).flags|=256),n=Xl(n,e),n!==2&&(e=ln,ln=t,e!==null&&jd(e)),n}function jd(n){ln===null?ln=n:ln.push.apply(ln,n)}function uM(n){for(var e=n;;){if(e.flags&16384){var t=e.updateQueue;if(t!==null&&(t=t.stores,t!==null))for(var i=0;i<t.length;i++){var r=t[i],s=r.getSnapshot;r=r.value;try{if(!ti(s(),r))return!1}catch{return!1}}}if(t=e.child,e.subtreeFlags&16384&&t!==null)t.return=e,e=t;else{if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function Yi(n,e){for(e&=~zf,e&=~vc,n.suspendedLanes|=e,n.pingedLanes&=~e,n=n.expirationTimes;0<e;){var t=31-Jn(e),i=1<<t;n[t]=-1,e&=~i}}function Mp(n){if(Je&6)throw Error(le(327));Us();var e=Cl(n,0);if(!(e&1))return fn(n,St()),null;var t=Xl(n,e);if(n.tag!==0&&t===2){var i=md(n);i!==0&&(e=i,t=Gd(n,i))}if(t===1)throw t=la,Fr(n,0),Yi(n,e),fn(n,St()),t;if(t===6)throw Error(le(345));return n.finishedWork=n.current.alternate,n.finishedLanes=e,Cr(n,ln,yi),fn(n,St()),null}function Vf(n,e){var t=Je;Je|=1;try{return n(e)}finally{Je=t,Je===0&&(Xs=St()+500,hc&&_r())}}function Hr(n){Ki!==null&&Ki.tag===0&&!(Je&6)&&Us();var e=Je;Je|=1;var t=kn.transition,i=ot;try{if(kn.transition=null,ot=1,n)return n()}finally{ot=i,kn.transition=t,Je=e,!(Je&6)&&_r()}}function Hf(){vn=bs.current,ft(bs)}function Fr(n,e){n.finishedWork=null,n.finishedLanes=0;var t=n.timeoutHandle;if(t!==-1&&(n.timeoutHandle=-1,By(t)),bt!==null)for(t=bt.return;t!==null;){var i=t;switch(Sf(i),i.tag){case 1:i=i.type.childContextTypes,i!=null&&Il();break;case 3:js(),ft(un),ft(en),Nf();break;case 5:Pf(i);break;case 4:js();break;case 13:ft(gt);break;case 19:ft(gt);break;case 10:Af(i.type._context);break;case 22:case 23:Hf()}t=t.return}if(Ft=n,bt=n=ar(n.current,null),Ht=vn=e,Rt=0,la=null,zf=vc=Vr=0,ln=Vo=null,Dr!==null){for(e=0;e<Dr.length;e++)if(t=Dr[e],i=t.interleaved,i!==null){t.interleaved=null;var r=i.next,s=t.pending;if(s!==null){var o=s.next;s.next=r,i.next=o}t.pending=i}Dr=null}return n}function Iv(n,e){do{var t=bt;try{if(Tf(),ml.current=Hl,Vl){for(var i=vt.memoizedState;i!==null;){var r=i.queue;r!==null&&(r.pending=null),i=i.next}Vl=!1}if(Br=0,Dt=Ct=vt=null,zo=!1,sa=0,kf.current=null,t===null||t.return===null){Rt=1,la=e,bt=null;break}e:{var s=n,o=t.return,a=t,l=e;if(e=Ht,a.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){var c=l,d=a,f=d.tag;if(!(d.mode&1)&&(f===0||f===11||f===15)){var h=d.alternate;h?(d.updateQueue=h.updateQueue,d.memoizedState=h.memoizedState,d.lanes=h.lanes):(d.updateQueue=null,d.memoizedState=null)}var p=lp(o);if(p!==null){p.flags&=-257,cp(p,o,a,s,e),p.mode&1&&ap(s,c,e),e=p,l=c;var g=e.updateQueue;if(g===null){var y=new Set;y.add(l),e.updateQueue=y}else g.add(l);break e}else{if(!(e&1)){ap(s,c,e),Gf();break e}l=Error(le(426))}}else if(pt&&a.mode&1){var m=lp(o);if(m!==null){!(m.flags&65536)&&(m.flags|=256),cp(m,o,a,s,e),Ef(Ws(l,a));break e}}s=l=Ws(l,a),Rt!==4&&(Rt=2),Vo===null?Vo=[s]:Vo.push(s),s=o;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var u=gv(s,l,e);tp(s,u);break e;case 1:a=l;var _=s.type,v=s.stateNode;if(!(s.flags&128)&&(typeof _.getDerivedStateFromError=="function"||v!==null&&typeof v.componentDidCatch=="function"&&(sr===null||!sr.has(v)))){s.flags|=65536,e&=-e,s.lanes|=e;var M=vv(s,a,e);tp(s,M);break e}}s=s.return}while(s!==null)}Fv(t)}catch(A){e=A,bt===t&&t!==null&&(bt=t=t.return);continue}break}while(!0)}function Dv(){var n=Gl.current;return Gl.current=Hl,n===null?Hl:n}function Gf(){(Rt===0||Rt===3||Rt===2)&&(Rt=4),Ft===null||!(Vr&268435455)&&!(vc&268435455)||Yi(Ft,Ht)}function Xl(n,e){var t=Je;Je|=2;var i=Dv();(Ft!==n||Ht!==e)&&(yi=null,Fr(n,e));do try{dM();break}catch(r){Iv(n,r)}while(!0);if(Tf(),Je=t,Gl.current=i,bt!==null)throw Error(le(261));return Ft=null,Ht=0,Rt}function dM(){for(;bt!==null;)Uv(bt)}function fM(){for(;bt!==null&&!Ox();)Uv(bt)}function Uv(n){var e=kv(n.alternate,n,vn);n.memoizedProps=n.pendingProps,e===null?Fv(n):bt=e,kf.current=null}function Fv(n){var e=n;do{var t=e.alternate;if(n=e.return,e.flags&32768){if(t=sM(t,e),t!==null){t.flags&=32767,bt=t;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{Rt=6,bt=null;return}}else if(t=rM(t,e,vn),t!==null){bt=t;return}if(e=e.sibling,e!==null){bt=e;return}bt=e=n}while(e!==null);Rt===0&&(Rt=5)}function Cr(n,e,t){var i=ot,r=kn.transition;try{kn.transition=null,ot=1,hM(n,e,t,i)}finally{kn.transition=r,ot=i}return null}function hM(n,e,t,i){do Us();while(Ki!==null);if(Je&6)throw Error(le(327));t=n.finishedWork;var r=n.finishedLanes;if(t===null)return null;if(n.finishedWork=null,n.finishedLanes=0,t===n.current)throw Error(le(177));n.callbackNode=null,n.callbackPriority=0;var s=t.lanes|t.childLanes;if($x(n,s),n===Ft&&(bt=Ft=null,Ht=0),!(t.subtreeFlags&2064)&&!(t.flags&2064)||Oa||(Oa=!0,zv(bl,function(){return Us(),null})),s=(t.flags&15990)!==0,t.subtreeFlags&15990||s){s=kn.transition,kn.transition=null;var o=ot;ot=1;var a=Je;Je|=4,kf.current=null,aM(n,t),Pv(t,n),Iy(Md),Rl=!!yd,Md=yd=null,n.current=t,lM(t),kx(),Je=a,ot=o,kn.transition=s}else n.current=t;if(Oa&&(Oa=!1,Ki=n,Wl=r),s=n.pendingLanes,s===0&&(sr=null),Vx(t.stateNode),fn(n,St()),e!==null)for(i=n.onRecoverableError,t=0;t<e.length;t++)r=e[t],i(r.value,{componentStack:r.stack,digest:r.digest});if(jl)throw jl=!1,n=Vd,Vd=null,n;return Wl&1&&n.tag!==0&&Us(),s=n.pendingLanes,s&1?n===Hd?Ho++:(Ho=0,Hd=n):Ho=0,_r(),null}function Us(){if(Ki!==null){var n=g0(Wl),e=kn.transition,t=ot;try{if(kn.transition=null,ot=16>n?16:n,Ki===null)var i=!1;else{if(n=Ki,Ki=null,Wl=0,Je&6)throw Error(le(331));var r=Je;for(Je|=4,_e=n.current;_e!==null;){var s=_e,o=s.child;if(_e.flags&16){var a=s.deletions;if(a!==null){for(var l=0;l<a.length;l++){var c=a[l];for(_e=c;_e!==null;){var d=_e;switch(d.tag){case 0:case 11:case 15:Bo(8,d,s)}var f=d.child;if(f!==null)f.return=d,_e=f;else for(;_e!==null;){d=_e;var h=d.sibling,p=d.return;if(bv(d),d===c){_e=null;break}if(h!==null){h.return=p,_e=h;break}_e=p}}}var g=s.alternate;if(g!==null){var y=g.child;if(y!==null){g.child=null;do{var m=y.sibling;y.sibling=null,y=m}while(y!==null)}}_e=s}}if(s.subtreeFlags&2064&&o!==null)o.return=s,_e=o;else e:for(;_e!==null;){if(s=_e,s.flags&2048)switch(s.tag){case 0:case 11:case 15:Bo(9,s,s.return)}var u=s.sibling;if(u!==null){u.return=s.return,_e=u;break e}_e=s.return}}var _=n.current;for(_e=_;_e!==null;){o=_e;var v=o.child;if(o.subtreeFlags&2064&&v!==null)v.return=o,_e=v;else e:for(o=_;_e!==null;){if(a=_e,a.flags&2048)try{switch(a.tag){case 0:case 11:case 15:gc(9,a)}}catch(A){Mt(a,a.return,A)}if(a===o){_e=null;break e}var M=a.sibling;if(M!==null){M.return=a.return,_e=M;break e}_e=a.return}}if(Je=r,_r(),li&&typeof li.onPostCommitFiberRoot=="function")try{li.onPostCommitFiberRoot(lc,n)}catch{}i=!0}return i}finally{ot=t,kn.transition=e}}return!1}function Sp(n,e,t){e=Ws(t,e),e=gv(n,e,1),n=rr(n,e,1),e=sn(),n!==null&&(pa(n,1,e),fn(n,e))}function Mt(n,e,t){if(n.tag===3)Sp(n,n,t);else for(;e!==null;){if(e.tag===3){Sp(e,n,t);break}else if(e.tag===1){var i=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(sr===null||!sr.has(i))){n=Ws(t,n),n=vv(e,n,1),e=rr(e,n,1),n=sn(),e!==null&&(pa(e,1,n),fn(e,n));break}}e=e.return}}function pM(n,e,t){var i=n.pingCache;i!==null&&i.delete(e),e=sn(),n.pingedLanes|=n.suspendedLanes&t,Ft===n&&(Ht&t)===t&&(Rt===4||Rt===3&&(Ht&130023424)===Ht&&500>St()-Bf?Fr(n,0):zf|=t),fn(n,e)}function Ov(n,e){e===0&&(n.mode&1?(e=ba,ba<<=1,!(ba&130023424)&&(ba=4194304)):e=1);var t=sn();n=Pi(n,e),n!==null&&(pa(n,e,t),fn(n,t))}function mM(n){var e=n.memoizedState,t=0;e!==null&&(t=e.retryLane),Ov(n,t)}function gM(n,e){var t=0;switch(n.tag){case 13:var i=n.stateNode,r=n.memoizedState;r!==null&&(t=r.retryLane);break;case 19:i=n.stateNode;break;default:throw Error(le(314))}i!==null&&i.delete(e),Ov(n,t)}var kv;kv=function(n,e,t){if(n!==null)if(n.memoizedProps!==e.pendingProps||un.current)cn=!0;else{if(!(n.lanes&t)&&!(e.flags&128))return cn=!1,iM(n,e,t);cn=!!(n.flags&131072)}else cn=!1,pt&&e.flags&1048576&&H0(e,Fl,e.index);switch(e.lanes=0,e.tag){case 2:var i=e.type;vl(n,e),n=e.pendingProps;var r=Vs(e,en.current);Ds(e,t),r=If(null,e,i,n,r,t);var s=Df();return e.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,dn(i)?(s=!0,Dl(e)):s=!1,e.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,Cf(e),r.updater=mc,e.stateNode=r,r._reactInternals=e,Pd(e,i,n,t),e=Id(null,e,i,!0,s,t)):(e.tag=0,pt&&s&&Mf(e),rn(null,e,r,t),e=e.child),e;case 16:i=e.elementType;e:{switch(vl(n,e),n=e.pendingProps,r=i._init,i=r(i._payload),e.type=i,r=e.tag=_M(i),n=$n(i,n),r){case 0:e=Ld(null,e,i,n,t);break e;case 1:e=fp(null,e,i,n,t);break e;case 11:e=up(null,e,i,n,t);break e;case 14:e=dp(null,e,i,$n(i.type,n),t);break e}throw Error(le(306,i,""))}return e;case 0:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:$n(i,r),Ld(n,e,i,r,t);case 1:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:$n(i,r),fp(n,e,i,r,t);case 3:e:{if(Mv(e),n===null)throw Error(le(387));i=e.pendingProps,s=e.memoizedState,r=s.element,Y0(n,e),zl(e,i,null,t);var o=e.memoizedState;if(i=o.element,s.isDehydrated)if(s={element:i,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){r=Ws(Error(le(423)),e),e=hp(n,e,i,t,r);break e}else if(i!==r){r=Ws(Error(le(424)),e),e=hp(n,e,i,t,r);break e}else for(Mn=ir(e.stateNode.containerInfo.firstChild),wn=e,pt=!0,qn=null,t=X0(e,null,i,t),e.child=t;t;)t.flags=t.flags&-3|4096,t=t.sibling;else{if(Hs(),i===r){e=Ni(n,e,t);break e}rn(n,e,i,t)}e=e.child}return e;case 5:return q0(e),n===null&&bd(e),i=e.type,r=e.pendingProps,s=n!==null?n.memoizedProps:null,o=r.children,Sd(i,r)?o=null:s!==null&&Sd(i,s)&&(e.flags|=32),yv(n,e),rn(n,e,o,t),e.child;case 6:return n===null&&bd(e),null;case 13:return Sv(n,e,t);case 4:return Rf(e,e.stateNode.containerInfo),i=e.pendingProps,n===null?e.child=Gs(e,null,i,t):rn(n,e,i,t),e.child;case 11:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:$n(i,r),up(n,e,i,r,t);case 7:return rn(n,e,e.pendingProps,t),e.child;case 8:return rn(n,e,e.pendingProps.children,t),e.child;case 12:return rn(n,e,e.pendingProps.children,t),e.child;case 10:e:{if(i=e.type._context,r=e.pendingProps,s=e.memoizedProps,o=r.value,ct(Ol,i._currentValue),i._currentValue=o,s!==null)if(ti(s.value,o)){if(s.children===r.children&&!un.current){e=Ni(n,e,t);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var a=s.dependencies;if(a!==null){o=s.child;for(var l=a.firstContext;l!==null;){if(l.context===i){if(s.tag===1){l=Ai(-1,t&-t),l.tag=2;var c=s.updateQueue;if(c!==null){c=c.shared;var d=c.pending;d===null?l.next=l:(l.next=d.next,d.next=l),c.pending=l}}s.lanes|=t,l=s.alternate,l!==null&&(l.lanes|=t),Cd(s.return,t,e),a.lanes|=t;break}l=l.next}}else if(s.tag===10)o=s.type===e.type?null:s.child;else if(s.tag===18){if(o=s.return,o===null)throw Error(le(341));o.lanes|=t,a=o.alternate,a!==null&&(a.lanes|=t),Cd(o,t,e),o=s.sibling}else o=s.child;if(o!==null)o.return=s;else for(o=s;o!==null;){if(o===e){o=null;break}if(s=o.sibling,s!==null){s.return=o.return,o=s;break}o=o.return}s=o}rn(n,e,r.children,t),e=e.child}return e;case 9:return r=e.type,i=e.pendingProps.children,Ds(e,t),r=Bn(r),i=i(r),e.flags|=1,rn(n,e,i,t),e.child;case 14:return i=e.type,r=$n(i,e.pendingProps),r=$n(i.type,r),dp(n,e,i,r,t);case 15:return _v(n,e,e.type,e.pendingProps,t);case 17:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:$n(i,r),vl(n,e),e.tag=1,dn(i)?(n=!0,Dl(e)):n=!1,Ds(e,t),mv(e,i,r),Pd(e,i,r,t),Id(null,e,i,!0,n,t);case 19:return Ev(n,e,t);case 22:return xv(n,e,t)}throw Error(le(156,e.tag))};function zv(n,e){return f0(n,e)}function vM(n,e,t,i){this.tag=n,this.key=t,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function On(n,e,t,i){return new vM(n,e,t,i)}function jf(n){return n=n.prototype,!(!n||!n.isReactComponent)}function _M(n){if(typeof n=="function")return jf(n)?1:0;if(n!=null){if(n=n.$$typeof,n===cf)return 11;if(n===uf)return 14}return 2}function ar(n,e){var t=n.alternate;return t===null?(t=On(n.tag,e,n.key,n.mode),t.elementType=n.elementType,t.type=n.type,t.stateNode=n.stateNode,t.alternate=n,n.alternate=t):(t.pendingProps=e,t.type=n.type,t.flags=0,t.subtreeFlags=0,t.deletions=null),t.flags=n.flags&14680064,t.childLanes=n.childLanes,t.lanes=n.lanes,t.child=n.child,t.memoizedProps=n.memoizedProps,t.memoizedState=n.memoizedState,t.updateQueue=n.updateQueue,e=n.dependencies,t.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},t.sibling=n.sibling,t.index=n.index,t.ref=n.ref,t}function yl(n,e,t,i,r,s){var o=2;if(i=n,typeof n=="function")jf(n)&&(o=1);else if(typeof n=="string")o=5;else e:switch(n){case vs:return Or(t.children,r,s,e);case lf:o=8,r|=8;break;case ed:return n=On(12,t,e,r|2),n.elementType=ed,n.lanes=s,n;case td:return n=On(13,t,e,r),n.elementType=td,n.lanes=s,n;case nd:return n=On(19,t,e,r),n.elementType=nd,n.lanes=s,n;case qg:return _c(t,r,s,e);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case $g:o=10;break e;case Yg:o=9;break e;case cf:o=11;break e;case uf:o=14;break e;case ji:o=16,i=null;break e}throw Error(le(130,n==null?n:typeof n,""))}return e=On(o,t,e,r),e.elementType=n,e.type=i,e.lanes=s,e}function Or(n,e,t,i){return n=On(7,n,i,e),n.lanes=t,n}function _c(n,e,t,i){return n=On(22,n,i,e),n.elementType=qg,n.lanes=t,n.stateNode={isHidden:!1},n}function iu(n,e,t){return n=On(6,n,null,e),n.lanes=t,n}function ru(n,e,t){return e=On(4,n.children!==null?n.children:[],n.key,e),e.lanes=t,e.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},e}function xM(n,e,t,i,r){this.tag=e,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=kc(0),this.expirationTimes=kc(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=kc(0),this.identifierPrefix=i,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function Wf(n,e,t,i,r,s,o,a,l){return n=new xM(n,e,t,a,l),e===1?(e=1,s===!0&&(e|=8)):e=0,s=On(3,null,null,e),n.current=s,s.stateNode=n,s.memoizedState={element:i,isDehydrated:t,cache:null,transitions:null,pendingSuspenseBoundaries:null},Cf(s),n}function yM(n,e,t){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:gs,key:i==null?null:""+i,children:n,containerInfo:e,implementation:t}}function Bv(n){if(!n)return fr;n=n._reactInternals;e:{if(jr(n)!==n||n.tag!==1)throw Error(le(170));var e=n;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(dn(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(le(171))}if(n.tag===1){var t=n.type;if(dn(t))return B0(n,t,e)}return e}function Vv(n,e,t,i,r,s,o,a,l){return n=Wf(t,i,!0,n,r,s,o,a,l),n.context=Bv(null),t=n.current,i=sn(),r=or(t),s=Ai(i,r),s.callback=e??null,rr(t,s,r),n.current.lanes=r,pa(n,r,i),fn(n,i),n}function xc(n,e,t,i){var r=e.current,s=sn(),o=or(r);return t=Bv(t),e.context===null?e.context=t:e.pendingContext=t,e=Ai(s,o),e.payload={element:n},i=i===void 0?null:i,i!==null&&(e.callback=i),n=rr(r,e,o),n!==null&&(Qn(n,r,o,s),pl(n,r,o)),o}function $l(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function Ep(n,e){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var t=n.retryLane;n.retryLane=t!==0&&t<e?t:e}}function Xf(n,e){Ep(n,e),(n=n.alternate)&&Ep(n,e)}function MM(){return null}var Hv=typeof reportError=="function"?reportError:function(n){console.error(n)};function $f(n){this._internalRoot=n}yc.prototype.render=$f.prototype.render=function(n){var e=this._internalRoot;if(e===null)throw Error(le(409));xc(n,e,null,null)};yc.prototype.unmount=$f.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var e=n.containerInfo;Hr(function(){xc(null,n,null,null)}),e[Ri]=null}};function yc(n){this._internalRoot=n}yc.prototype.unstable_scheduleHydration=function(n){if(n){var e=x0();n={blockedOn:null,target:n,priority:e};for(var t=0;t<$i.length&&e!==0&&e<$i[t].priority;t++);$i.splice(t,0,n),t===0&&M0(n)}};function Yf(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function Mc(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function wp(){}function SM(n,e,t,i,r){if(r){if(typeof i=="function"){var s=i;i=function(){var c=$l(o);s.call(c)}}var o=Vv(e,i,n,0,null,!1,!1,"",wp);return n._reactRootContainer=o,n[Ri]=o.current,ea(n.nodeType===8?n.parentNode:n),Hr(),o}for(;r=n.lastChild;)n.removeChild(r);if(typeof i=="function"){var a=i;i=function(){var c=$l(l);a.call(c)}}var l=Wf(n,0,!1,null,null,!1,!1,"",wp);return n._reactRootContainer=l,n[Ri]=l.current,ea(n.nodeType===8?n.parentNode:n),Hr(function(){xc(e,l,t,i)}),l}function Sc(n,e,t,i,r){var s=t._reactRootContainer;if(s){var o=s;if(typeof r=="function"){var a=r;r=function(){var l=$l(o);a.call(l)}}xc(e,o,n,r)}else o=SM(t,e,n,r,i);return $l(o)}v0=function(n){switch(n.tag){case 3:var e=n.stateNode;if(e.current.memoizedState.isDehydrated){var t=Ro(e.pendingLanes);t!==0&&(hf(e,t|1),fn(e,St()),!(Je&6)&&(Xs=St()+500,_r()))}break;case 13:Hr(function(){var i=Pi(n,1);if(i!==null){var r=sn();Qn(i,n,1,r)}}),Xf(n,1)}};pf=function(n){if(n.tag===13){var e=Pi(n,134217728);if(e!==null){var t=sn();Qn(e,n,134217728,t)}Xf(n,134217728)}};_0=function(n){if(n.tag===13){var e=or(n),t=Pi(n,e);if(t!==null){var i=sn();Qn(t,n,e,i)}Xf(n,e)}};x0=function(){return ot};y0=function(n,e){var t=ot;try{return ot=n,e()}finally{ot=t}};fd=function(n,e,t){switch(e){case"input":if(sd(n,t),e=t.name,t.type==="radio"&&e!=null){for(t=n;t.parentNode;)t=t.parentNode;for(t=t.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<t.length;e++){var i=t[e];if(i!==n&&i.form===n.form){var r=fc(i);if(!r)throw Error(le(90));Zg(i),sd(i,r)}}}break;case"textarea":Qg(n,t);break;case"select":e=t.value,e!=null&&Ps(n,!!t.multiple,e,!1)}};o0=Vf;a0=Hr;var EM={usingClientEntryPoint:!1,Events:[ga,Ms,fc,r0,s0,Vf]},_o={findFiberByHostInstance:Ir,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},wM={bundleType:_o.bundleType,version:_o.version,rendererPackageName:_o.rendererPackageName,rendererConfig:_o.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Li.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=u0(n),n===null?null:n.stateNode},findFiberByHostInstance:_o.findFiberByHostInstance||MM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ka=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ka.isDisabled&&ka.supportsFiber)try{lc=ka.inject(wM),li=ka}catch{}}An.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=EM;An.createPortal=function(n,e){var t=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Yf(e))throw Error(le(200));return yM(n,e,null,t)};An.createRoot=function(n,e){if(!Yf(n))throw Error(le(299));var t=!1,i="",r=Hv;return e!=null&&(e.unstable_strictMode===!0&&(t=!0),e.identifierPrefix!==void 0&&(i=e.identifierPrefix),e.onRecoverableError!==void 0&&(r=e.onRecoverableError)),e=Wf(n,1,!1,null,null,t,!1,i,r),n[Ri]=e.current,ea(n.nodeType===8?n.parentNode:n),new $f(e)};An.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var e=n._reactInternals;if(e===void 0)throw typeof n.render=="function"?Error(le(188)):(n=Object.keys(n).join(","),Error(le(268,n)));return n=u0(e),n=n===null?null:n.stateNode,n};An.flushSync=function(n){return Hr(n)};An.hydrate=function(n,e,t){if(!Mc(e))throw Error(le(200));return Sc(null,n,e,!0,t)};An.hydrateRoot=function(n,e,t){if(!Yf(n))throw Error(le(405));var i=t!=null&&t.hydratedSources||null,r=!1,s="",o=Hv;if(t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(o=t.onRecoverableError)),e=Vv(e,null,n,1,t??null,r,!1,s,o),n[Ri]=e.current,ea(n),i)for(n=0;n<i.length;n++)t=i[n],r=t._getVersion,r=r(t._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[t,r]:e.mutableSourceEagerHydrationData.push(t,r);return new yc(e)};An.render=function(n,e,t){if(!Mc(e))throw Error(le(200));return Sc(null,n,e,!1,t)};An.unmountComponentAtNode=function(n){if(!Mc(n))throw Error(le(40));return n._reactRootContainer?(Hr(function(){Sc(null,null,n,!1,function(){n._reactRootContainer=null,n[Ri]=null})}),!0):!1};An.unstable_batchedUpdates=Vf;An.unstable_renderSubtreeIntoContainer=function(n,e,t,i){if(!Mc(t))throw Error(le(200));if(n==null||n._reactInternals===void 0)throw Error(le(38));return Sc(n,e,t,!1,i)};An.version="18.3.1-next-f1338f8080-20240426";function Gv(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Gv)}catch(n){console.error(n)}}Gv(),Gg.exports=An;var TM=Gg.exports,jv,Tp=TM;jv=Tp.createRoot,Tp.hydrateRoot;const AM={},Ap=n=>{let e;const t=new Set,i=(d,f)=>{const h=typeof d=="function"?d(e):d;if(!Object.is(h,e)){const p=e;e=f??(typeof h!="object"||h===null)?h:Object.assign({},e,h),t.forEach(g=>g(e,p))}},r=()=>e,l={setState:i,getState:r,getInitialState:()=>c,subscribe:d=>(t.add(d),()=>t.delete(d)),destroy:()=>{(AM?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),t.clear()}},c=e=n(i,r,l);return l},bM=n=>n?Ap(n):Ap;var Wv={exports:{}},Xv={},$v={exports:{}},Yv={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var $s=te;function CM(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var RM=typeof Object.is=="function"?Object.is:CM,PM=$s.useState,NM=$s.useEffect,LM=$s.useLayoutEffect,IM=$s.useDebugValue;function DM(n,e){var t=e(),i=PM({inst:{value:t,getSnapshot:e}}),r=i[0].inst,s=i[1];return LM(function(){r.value=t,r.getSnapshot=e,su(r)&&s({inst:r})},[n,t,e]),NM(function(){return su(r)&&s({inst:r}),n(function(){su(r)&&s({inst:r})})},[n]),IM(t),t}function su(n){var e=n.getSnapshot;n=n.value;try{var t=e();return!RM(n,t)}catch{return!0}}function UM(n,e){return e()}var FM=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?UM:DM;Yv.useSyncExternalStore=$s.useSyncExternalStore!==void 0?$s.useSyncExternalStore:FM;$v.exports=Yv;var OM=$v.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Ec=te,kM=OM;function zM(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var BM=typeof Object.is=="function"?Object.is:zM,VM=kM.useSyncExternalStore,HM=Ec.useRef,GM=Ec.useEffect,jM=Ec.useMemo,WM=Ec.useDebugValue;Xv.useSyncExternalStoreWithSelector=function(n,e,t,i,r){var s=HM(null);if(s.current===null){var o={hasValue:!1,value:null};s.current=o}else o=s.current;s=jM(function(){function l(p){if(!c){if(c=!0,d=p,p=i(p),r!==void 0&&o.hasValue){var g=o.value;if(r(g,p))return f=g}return f=p}if(g=f,BM(d,p))return g;var y=i(p);return r!==void 0&&r(g,y)?(d=p,g):(d=p,f=y)}var c=!1,d,f,h=t===void 0?null:t;return[function(){return l(e())},h===null?void 0:function(){return l(h())}]},[e,t,i,r]);var a=VM(n,s[0],s[1]);return GM(function(){o.hasValue=!0,o.value=a},[a]),WM(a),a};Wv.exports=Xv;var XM=Wv.exports;const $M=Ng(XM),qv={},{useDebugValue:YM}=px,{useSyncExternalStoreWithSelector:qM}=$M;let bp=!1;const KM=n=>n;function ZM(n,e=KM,t){(qv?"production":void 0)!=="production"&&t&&!bp&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),bp=!0);const i=qM(n.subscribe,n.getState,n.getServerState||n.getInitialState,e,t);return YM(i),i}const Cp=n=>{(qv?"production":void 0)!=="production"&&typeof n!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const e=typeof n=="function"?bM(n):n,t=(i,r)=>ZM(e,i,r);return Object.assign(t,e),t},_a=n=>n?Cp(n):Cp,JM=1.2,Rp=.07,Yl=.13,yn=.36,ps={R2:1.341,R3:1.285,R4:1.06,R5:.803,R6:1.341},Go=Math.PI*(100/180),Kn=["R1","R2","R3","R4","R5","R6","R7"],xt=[{id:"J1",label:"CUBE L",type:"twist",bodyA:"R1",bodyB:"R2",limit:Math.PI},{id:"J2",label:"JOINT 1",type:"bend",bodyA:"R2",bodyB:"R3",limit:Go},{id:"J3",label:"JOINT 2",type:"bend",bodyA:"R3",bodyB:"R4",limit:Go},{id:"J4",label:"WRIST",type:"twist",bodyA:"R4",bodyB:"R5",limit:Math.PI},{id:"J5",label:"JOINT 3",type:"bend",bodyA:"R5",bodyB:"R6",limit:Go},{id:"J6",label:"CUBE R",type:"twist",bodyA:"R6",bodyB:"R7",limit:Math.PI}],QM=()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}),yt=_a((n,e)=>({activeRootId:"R1",jointAngles:[0,0,0,0,0,0],joints:Array.from({length:6},QM),isDragging:!1,status:"idle",endEffectorPosition:{x:0,y:0,z:0},reachPercent:0,pendingHome:!1,mode:"horizontal",setRootRod:t=>{t!==e().activeRootId&&n({activeRootId:t})},setRootAndAngles:(t,i)=>{const r=i.map((s,o)=>{const a=xt[o].limit;return Math.max(-a,Math.min(a,s))});n({activeRootId:t,jointAngles:r})},setJointAngle:(t,i)=>{const r=xt[t].limit,s=Math.max(-r,Math.min(r,i)),o=[...e().jointAngles];o[t]=s,n({jointAngles:o})},setJointTelemetry:t=>n({joints:t}),setStatus:t=>n({status:t}),updateEndEffector:(t,i)=>n({endEffectorPosition:t,reachPercent:i}),homeArm:()=>n({pendingHome:!0}),clearPendingHome:()=>n({pendingHome:!1}),setMode:t=>n({mode:t}),collision:!1,setCollision:t=>n({collision:t}),setAllAngles:t=>{const i=t.map((r,s)=>{const o=xt[s].limit;return Math.max(-o,Math.min(o,r))});n({jointAngles:i})}})),Pp=(n,e,t={x:0,y:0,z:0})=>({id:n,label:e,angles:[0,0,0,0,0,0],activeRootId:"R1",position:{x:t.x??0,y:t.y??0,z:t.z??0},quaternion:{x:0,y:0,z:0,w:1},mode:"horizontal"}),Le=_a((n,e)=>({modules:[Pp("module-0","Module 1",{x:0,y:0,z:0})],activeModuleId:"module-0",nextId:1,welds:[],setModuleAngles(t,i){n(r=>({modules:r.modules.map(s=>s.id===t?{...s,angles:[...i]}:s)}))},setModuleTransform(t,i,r){n(s=>({modules:s.modules.map(o=>o.id===t?{...o,position:{x:i.x,y:i.y,z:i.z},quaternion:{x:r.x,y:r.y,z:r.z,w:r.w}}:o)}))},connectMode:!1,face1:null,face2:null,connectError:null,deleteMode:!1,setDeleteMode(t){n({deleteMode:t})},disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null,removeModule(t){const{modules:i,activeModuleId:r,welds:s}=e();if(i.length<=1)return;const o=i.filter(c=>c.id!==t).map((c,d)=>({...c,label:`Module ${d+1}`})),a=r===t?o[0].id:r,l=s.filter(c=>c.a.moduleId!==t&&c.b.moduleId!==t);n({modules:o,activeModuleId:a,welds:l})},addModule(t=null){const i=e().modules;let r;if(t&&typeof t.z=="number")r={x:t.x??0,y:t.y??0,z:t.z};else{const l=new Set(i.map(d=>Math.round(d.position.z/4)));let c=0;for(;l.has(c);)c++;r={x:0,y:0,z:c*4}}const o=`module-${e().nextId}`,a=`Module ${i.length+1}`;return n(l=>({modules:[...l.modules,Pp(o,a,r)],nextId:l.nextId+1})),o},setActiveModule(t){n({activeModuleId:t})},saveModuleState(t,{angles:i,activeRootId:r,position:s,quaternion:o,mode:a}){n(l=>({modules:l.modules.map(c=>c.id===t?{...c,angles:i,activeRootId:r,position:s,quaternion:o,mode:a}:c)}))},setConnectMode(t){n({connectMode:t,face1:null,face2:null,connectError:null})},setDisconnectMode(t){n({disconnectMode:t,dSel1:null,dSel2:null,disconnectError:null})},setDSel1(t){n({dSel1:t,disconnectError:null})},setDSel2(t){n({dSel2:t,disconnectError:null})},clearDSelections(){n({dSel1:null,dSel2:null,disconnectError:null})},setDisconnectError(t){n({disconnectError:t})},applyDisconnect(t){n(i=>{const r=new Set(i.modules.filter(l=>l.id!==t).map(l=>Math.round(l.position.z/4)));let s=0;for(;r.has(s);)s++;const o=i.dSel1,a=i.welds.filter(l=>{const c=new Set([l.a.moduleId,l.b.moduleId]);return!(c.has(t)&&c.has(o))});return{modules:i.modules.map(l=>l.id===t?{...l,position:{x:0,y:0,z:s*4},quaternion:{x:0,y:0,z:0,w:1}}:l),welds:a,disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null}})},setFace1(t){n({face1:t,connectError:null})},setFace2(t){n({face2:t,connectError:null})},clearFaces(){n({face1:null,face2:null,connectError:null})},setConnectError(t){n({connectError:t})},applyJoin(t=null){n(i=>{let r=i.welds;return t&&(r=i.welds.filter(s=>{const o=new Set([s.a.moduleId,s.b.moduleId]);return!(o.has(t.a.moduleId)&&o.has(t.b.moduleId))}),r=[...r,t]),{welds:r,connectMode:!1,face1:null,face2:null,connectError:null}})}})),Ee={camera:null,animateTo:null,fitCamera:null,orbitDelta:null,getArmNodes:null},Kv="tetrobot-project",Zv=1;function Jv(){var e;(e=Ee.commitLiveState)==null||e.call(Ee);const n=Le.getState();return{format:Kv,version:Zv,app:"TETROBOT",savedAt:new Date().toISOString(),scene:{activeModuleId:n.activeModuleId,nextId:n.nextId,modules:n.modules.map(t=>({id:t.id,label:t.label,angles:[...t.angles],activeRootId:t.activeRootId,position:{...t.position},quaternion:{...t.quaternion},mode:t.mode})),welds:n.welds.map(t=>({a:{moduleId:t.a.moduleId,faceKey:t.a.faceKey},b:{moduleId:t.b.moduleId,faceKey:t.b.faceKey},mate:Array.isArray(t.mate)?[...t.mate]:null}))}}}const Oi=(n,e=0)=>Number.isFinite(+n)?+n:e;function eS(n){if(!n||typeof n!="object"||n.format!==Kv)throw new Error("Not a TETROBOT project file.");if(typeof n.version!="number"||n.version>Zv)throw new Error(`Unsupported project version: ${n.version}`);const e=n.scene??{},t=Array.isArray(e.modules)?e.modules:[];if(t.length===0)throw new Error("Project contains no modules.");const i=t.map((l,c)=>{var d,f,h,p,g,y,m;return{id:String((l==null?void 0:l.id)??`module-${c}`),label:String((l==null?void 0:l.label)??`Module ${c+1}`),angles:Array.isArray(l==null?void 0:l.angles)&&l.angles.length===6?l.angles.map(u=>Oi(u,0)):[0,0,0,0,0,0],activeRootId:typeof(l==null?void 0:l.activeRootId)=="string"?l.activeRootId:"R1",position:{x:Oi((d=l==null?void 0:l.position)==null?void 0:d.x),y:Oi((f=l==null?void 0:l.position)==null?void 0:f.y),z:Oi((h=l==null?void 0:l.position)==null?void 0:h.z)},quaternion:{x:Oi((p=l==null?void 0:l.quaternion)==null?void 0:p.x),y:Oi((g=l==null?void 0:l.quaternion)==null?void 0:g.y),z:Oi((y=l==null?void 0:l.quaternion)==null?void 0:y.z),w:((m=l==null?void 0:l.quaternion)==null?void 0:m.w)==null?1:Oi(l.quaternion.w,1)},mode:(l==null?void 0:l.mode)==="vertical"?"vertical":"horizontal"}}),r=new Set(i.map(l=>l.id)),s=r.has(e.activeModuleId)?e.activeModuleId:i[0].id,o=(Array.isArray(e.welds)?e.welds:[]).filter(l=>{var c,d;return((c=l==null?void 0:l.a)==null?void 0:c.moduleId)&&((d=l==null?void 0:l.b)==null?void 0:d.moduleId)&&r.has(l.a.moduleId)&&r.has(l.b.moduleId)}).map(l=>({a:{moduleId:l.a.moduleId,faceKey:l.a.faceKey},b:{moduleId:l.b.moduleId,faceKey:l.b.faceKey},mate:Array.isArray(l.mate)&&l.mate.length===16?l.mate.map(Number):null}));let a=Number(e.nextId);return Number.isFinite(a)||(a=1+i.reduce((l,c)=>{const d=parseInt(String(c.id).replace(/\D/g,""),10);return Number.isFinite(d)?Math.max(l,d):l},0)),{modules:i,welds:o,activeModuleId:s,nextId:a}}const Qv="TETROBOT::nischay::v2::format-key::do-not-redistribute",e_=[78,83,72,67,82,89],t_=2,Wd=new TextEncoder,Np=new TextDecoder;async function qf(n){return new Uint8Array(await crypto.subtle.digest("SHA-256",n))}function ql(n){let e=0;for(const r of n)e+=r.length;const t=new Uint8Array(e);let i=0;for(const r of n)t.set(r,i),i+=r.length;return t}function tS(n){return new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255])}async function n_(n,e){const t=new Uint8Array(e);let i=0,r=0;for(;i<e;){const s=await qf(ql([n,tS(r)])),o=Math.min(32,e-i);t.set(s.subarray(0,o),i),i+=o,r++}return t}function i_(n,e){const t=new Uint8Array(n.length);for(let i=0;i<n.length;i++)t[i]=n[i]^e[i];return t}async function r_(n){const e=Wd.encode(JSON.stringify(n)),t=crypto.getRandomValues(new Uint8Array(16)),i=await qf(ql([Wd.encode(Qv),t])),r=await n_(i,e.length),s=i_(e,r);return ql([new Uint8Array(e_),new Uint8Array([t_,0]),t,s])}async function Lp(n){const e=new Uint8Array(n);if(e.length===0)throw new Error("Empty file.");if(e[0]===123||e[0]===32||e[0]===10||e[0]===9||e[0]===239)try{return JSON.parse(Np.decode(e))}catch{}if(e.length<24||!e_.every((a,l)=>e[l]===a))throw new Error("Not a TETROBOT .nischay file.");if(e[6]>t_)throw new Error("File was made with a newer version — update the app.");const t=e.slice(8,24),i=e.slice(24),r=await qf(ql([Wd.encode(Qv),t])),s=await n_(r,i.length),o=i_(i,s);return JSON.parse(Np.decode(o))}const nS={"application/octet-stream":[".nischay"]},iS={"application/octet-stream":[".nischay"],"application/json":[".json"]};function Ml(n,e){const t=URL.createObjectURL(n),i=document.createElement("a");i.href=t,i.download=e,i.click(),URL.revokeObjectURL(t)}async function rS(n,e="untitled.nischay"){const t=await r_(n);if(window.showSaveFilePicker)try{const i=await window.showSaveFilePicker({suggestedName:e,types:[{description:"TETROBOT Project",accept:nS}]}),r=await i.createWritable();return await r.write(t),await r.close(),{name:i.name,handle:i}}catch(i){if((i==null?void 0:i.name)==="AbortError")return null}return Ml(new Blob([t],{type:"application/octet-stream"}),e),{name:e,handle:null}}async function sS(){if(window.showOpenFilePicker)try{const[n]=await window.showOpenFilePicker({types:[{description:"TETROBOT Project",accept:iS}]}),e=await n.getFile();return{data:await Lp(await e.arrayBuffer()),name:n.name,handle:n}}catch(n){if((n==null?void 0:n.name)==="AbortError")return null;throw n}return new Promise((n,e)=>{const t=document.createElement("input");t.type="file",t.accept=".nischay,.json",t.onchange=async()=>{var r;const i=(r=t.files)==null?void 0:r[0];if(!i){n(null);return}try{n({data:await Lp(await i.arrayBuffer()),name:i.name,handle:null})}catch(s){e(s)}},t.click()})}async function oS(n,e){const t=await r_(e),i=await n.createWritable();await i.write(t),await i.close()}const lr=_a(n=>({name:null,handle:null,status:"idle",setDoc:(e,t)=>n({name:e,handle:t,status:t?"saved":"idle"}),setStatus:e=>n({status:e})})),ca=180/Math.PI,s_=Math.PI/180,Ip=[{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"},{main:"#0088ff",glow:"#0088ff33",track:"#d0e8ff",neg:"#cc3344"},{main:"#9944ff",glow:"#9944ff33",track:"#e8d8ff",neg:"#cc3344"},{main:"#00aabb",glow:"#00aabb33",track:"#ccf0f4",neg:"#cc3344"},{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"}];function Dp({value:n,format:e,className:t,style:i}){const r=te.useRef(null),s=te.useRef(n),o=te.useRef(null);return te.useEffect(()=>{const a=n,l=()=>{s.current+=(a-s.current)*.14,r.current&&(r.current.textContent=e(s.current)),Math.abs(a-s.current)>.005&&(o.current=requestAnimationFrame(l))};return o.current=requestAnimationFrame(l),()=>{o.current&&cancelAnimationFrame(o.current)}},[n,e]),x.jsx("span",{ref:r,className:t,style:i,children:e(n)})}function aS({rawAngle:n,palette:e,panelIdx:t,limit:i,onJointSet:r}){const[s,o]=te.useState(!1),[a,l]=te.useState(""),c=te.useRef(null),d=(n*ca+180).toFixed(1),f=te.useCallback(()=>{l((n*ca+180).toFixed(1)),o(!0)},[n]);te.useEffect(()=>{s&&c.current&&(c.current.focus(),c.current.select())},[s]);const h=te.useCallback(()=>{const g=parseFloat(a);if(!isNaN(g)&&r){const y=(g-180)*s_,m=Math.max(-i,Math.min(i,y));r(t,m)}o(!1)},[a,r,t,i]),p=te.useCallback(g=>{g.key==="Enter"&&(g.preventDefault(),h()),g.key==="Escape"&&o(!1)},[h]);return s?x.jsx("input",{ref:c,className:"angle-input editing",style:{color:e==null?void 0:e.main},type:"text",value:a,onChange:g=>l(g.target.value),onBlur:h,onKeyDown:p}):x.jsxs("span",{className:"stat-val angle-input-display",style:{color:e==null?void 0:e.main,cursor:"text"},title:"Click to set angle (80–280° bend · 0–360° twist)",onClick:f,children:[d,"°"]})}function lS({angle:n,rawAngle:e,limit:t,limitHit:i,palette:r,panelIdx:s,onDrag:o}){const f=te.useRef(null),h=te.useRef(!1),p=te.useRef(null);te.useEffect(()=>()=>{p.current&&cancelAnimationFrame(p.current)},[]);const g=i?"#ffdddd":(r==null?void 0:r.track)??"#d0e8ff",y=i?(r==null?void 0:r.neg)??"#cc3344":(r==null?void 0:r.main)??"#0088ff",m=i?"#ff5533":(r==null?void 0:r.main)??"#0088ff",u=h.current?e??n:n;function _(G,B,J=1){const Z=ue=>(ue-90)*(Math.PI/180),P=44+36*Math.cos(Z(G)),k=44+36*Math.sin(Z(G)),z=44+36*Math.cos(Z(B)),H=44+36*Math.sin(Z(B)),X=Math.abs(B-G)>180?1:0;return`M ${P} ${k} A 36 36 0 ${X} ${J} ${z} ${H}`}const v=t*180/Math.PI,M=u*180/Math.PI,A=Math.max(-v,Math.min(v,M)),b=(A-90)*(Math.PI/180),T=44+36*Math.cos(b),N=44+36*Math.sin(b),w=te.useCallback(G=>{const B=f.current;if(!B)return 0;const J=B.getBoundingClientRect(),Z=G.clientX-J.left,P=G.clientY-J.top,k=Math.atan2(Z-44,-(P-44))*ca;return Math.max(-t,Math.min(t,k*s_))},[44,44,t]),S=te.useCallback(G=>{if(G.currentTarget.setPointerCapture(G.pointerId),h.current=!0,!o)return;const B=w(G),J=e??n;p.current&&(cancelAnimationFrame(p.current),p.current=null);const Z=performance.now(),P=220,k=()=>{const z=Math.min((performance.now()-Z)/P,1),H=z<.5?2*z*z:-1+(4-2*z)*z;o(s,J+(B-J)*H),z<1?p.current=requestAnimationFrame(k):p.current=null};p.current=requestAnimationFrame(k)},[o,s,w,e,n]),D=te.useCallback(G=>{!h.current||!o||(p.current&&(cancelAnimationFrame(p.current),p.current=null),o(s,w(G)))},[o,s,w]),V=te.useCallback(()=>{h.current=!1},[]),I=!!o;return x.jsxs("svg",{ref:f,width:88,height:88,style:{flexShrink:0,cursor:I?"crosshair":"default",touchAction:"none"},onPointerDown:I?S:void 0,onPointerMove:I?D:void 0,onPointerUp:I?V:void 0,children:[I&&x.jsx("circle",{cx:44,cy:44,r:44,fill:"transparent"}),x.jsx("path",{d:_(-v,v),fill:"none",stroke:g,strokeWidth:"5",strokeLinecap:"round"}),x.jsx("circle",{cx:44+36*Math.cos((-v-90)*Math.PI/180),cy:44+36*Math.sin((-v-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),x.jsx("circle",{cx:44+36*Math.cos((v-90)*Math.PI/180),cy:44+36*Math.sin((v-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),x.jsx("line",{x1:44,y1:12,x2:44,y2:19,stroke:(r==null?void 0:r.main)??"#0088ff",strokeWidth:"2",opacity:"0.7"}),Math.abs(A)>.5&&x.jsx("path",{d:_(0,A,A>=0?1:0),fill:"none",stroke:y,strokeWidth:"4.5",strokeLinecap:"round",style:{filter:i?"none":`drop-shadow(0 0 4px ${y}88)`}}),x.jsx("circle",{cx:T,cy:N,r:I?6:4.5,fill:m,style:{filter:`drop-shadow(0 0 5px ${m})`}}),x.jsxs("text",{x:44,y:49,textAnchor:"middle",fontSize:"10",fontFamily:"monospace",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.85",children:[(180+A).toFixed(0),"°"]})]})}function cS({velocity:n}){const e=Math.abs(n),t=n>=0?"→":"←",i=Math.min(e/5,1),r=Math.round(i*5),s=e>3?"#ffaa00":"#00aaff";return x.jsxs("div",{className:"vel-arrow",children:[x.jsx("span",{className:"vel-dir",style:{color:s},children:t}),x.jsx("span",{className:"vel-bars",children:Array.from({length:5},(o,a)=>x.jsx("span",{className:"vel-bar",style:{opacity:a<r?1:.15,background:s}},a))})]})}function uS({joint:n,index:e,rawAngle:t,onArcDrag:i,onJointHome:r,onJointSet:s,collision:o=!1}){const{angle:a=0,velocity:l=0,acceleration:c=0,limitHit:d=!1}=n??{},f=xt[e],h=Ip[e]??Ip[1],p=(f==null?void 0:f.type)==="twist",g=(f==null?void 0:f.limit)??Math.PI,y=(f==null?void 0:f.label)??`JOINT ${e+1}`;return x.jsxs("div",{className:`joint-card ${d?"limit-hit":""} ${o?"collision-hit":""}`,style:{"--joint-color":h.main,"--joint-glow":h.glow},children:[x.jsx("div",{className:"joint-accent"}),x.jsxs("div",{className:"joint-header",children:[x.jsx("span",{className:"joint-label",style:{color:h.main},children:y}),x.jsxs("div",{className:"joint-header-right",children:[o&&x.jsx("span",{className:"collision-badge",children:"COLL"}),d&&!p&&x.jsx("span",{className:"limit-badge",children:"LIMIT"}),r&&x.jsx("button",{className:"joint-home-btn",onClick:()=>r(e),title:`Reset ${y} to home (180°)`,style:{"--joint-color":h.main},children:"↺"})]})]}),x.jsxs("div",{className:"joint-body",children:[x.jsx(lS,{angle:a,rawAngle:t,limit:g,limitHit:d&&!p,palette:h,panelIdx:e,onDrag:i}),x.jsxs("div",{className:"joint-stats",children:[x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"ANG"}),x.jsx(aS,{rawAngle:t??a,palette:h,panelIdx:e,limit:g,onJointSet:s})]}),x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"VEL"}),x.jsxs("div",{className:"stat-val-group",children:[x.jsx(Dp,{value:l*ca,format:m=>`${Math.abs(m).toFixed(1)}°/s`,className:"stat-val"}),x.jsx(cS,{velocity:l})]})]}),x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"ACC"}),x.jsx(Dp,{value:c*ca,format:m=>`${m>=0?"+":""}${m.toFixed(0)}°/s²`,className:`stat-val ${Math.abs(c)>5?"accent":""}`})]})]})]})]})}function dS({style:n}){var k,z,H,X,ue;const e=yt(U=>U.joints),t=yt(U=>U.activeRootId),i=yt(U=>U.jointAngles),r=yt(U=>U.homeArm),s=yt(U=>U.setJointAngle),o=yt(U=>U.collision),a=Le(U=>U.modules),l=Le(U=>U.activeModuleId),c=Le(U=>U.setActiveModule),d=Le(U=>U.addModule);Le(U=>U.removeModule);const f=Le(U=>U.deleteMode),h=Le(U=>U.setDeleteMode),p=Le(U=>U.connectMode),g=Le(U=>U.setConnectMode),y=Le(U=>U.face1),m=Le(U=>U.face2),u=Le(U=>U.connectError),_=Le(U=>U.clearFaces),v=Le(U=>U.disconnectMode),M=Le(U=>U.setDisconnectMode),A=Le(U=>U.dSel1),b=Le(U=>U.dSel2),T=Le(U=>U.disconnectError),N=Le(U=>U.clearDSelections),w=Kn.indexOf(t),S=U=>w>U?-1:1,D=((k=a.find(U=>U.id===l))==null?void 0:k.label)??"Module 1",V=async()=>{const U=await rS(Jv(),"tetrobot.nischay");U&&lr.getState().setDoc(U.name,U.handle)},I=async()=>{var U;try{const ee=await sS();if(!ee)return;const ie=(U=Ee.loadScene)==null?void 0:U.call(Ee,ee.data);if(ie&&!ie.ok){alert(`Could not open project: ${ie.error}`);return}lr.getState().setDoc(ee.name,ee.handle)}catch(ee){alert(`Could not open file: ${ee.message}`)}},[G,B]=te.useState(!1),[J,Z]=te.useState(!1),P=U=>{var ie;const ee=(ie=Ee.exportModel)==null?void 0:ie.call(Ee,U);if(ee&&!ee.ok){alert(ee.error);return}B(!1)};return x.jsxs("aside",{className:"left-panel fade-in",style:n,children:[x.jsxs("div",{className:"section module-actions",children:[x.jsx("div",{className:"section-title",children:"PROJECT"}),x.jsxs("button",{className:"add-module-btn",onClick:I,title:"Open a .nischay project file",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M2 4h4l1.5 1.5H14V13H2V4z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"})}),"OPEN PROJECT"]}),x.jsxs("button",{className:"add-module-btn",onClick:V,title:"Save the scene to a .nischay file",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("path",{d:"M3 2h8l3 3v9H3V2z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"}),x.jsx("path",{d:"M5 2v4h5V2M5 14v-4h6v4",stroke:"currentColor",strokeWidth:"1.2",strokeLinejoin:"round"})]}),"SAVE PROJECT"]}),x.jsxs("button",{className:"add-module-btn",onClick:()=>B(!0),title:"Export the model (OBJ / STL / STEP / GLB)",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M8 2v8M8 10l-3-3M8 10l3-3M3 13h10",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round",strokeLinejoin:"round"})}),"EXPORT"]})]}),G&&x.jsx("div",{className:"export-modal-backdrop",onClick:()=>B(!1),children:x.jsxs("div",{className:"export-modal",onClick:U=>U.stopPropagation(),children:[x.jsx("div",{className:"export-modal-title",children:"EXPORT AS"}),x.jsxs("button",{className:"export-opt",onClick:()=>P("obj"),children:["OBJ ",x.jsx("small",{children:"mesh + materials"})]}),x.jsxs("button",{className:"export-opt",onClick:()=>P("stl"),children:["STL ",x.jsx("small",{children:"mesh only · 3D print"})]}),x.jsxs("button",{className:"export-opt export-opt--soft",onClick:()=>P("step"),children:["STEP ",x.jsx("small",{children:"CAD · not supported yet"})]}),x.jsxs("button",{className:"export-opt",onClick:()=>P("glb"),children:["GLB ",x.jsx("small",{children:"Blender / 3D viewers"})]}),x.jsx("button",{className:"export-cancel",onClick:()=>B(!1),children:"Cancel"})]})}),a.length>1&&x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"ACTIVE MODULE"}),x.jsx("select",{className:"module-select",value:l,onChange:U=>c(U.target.value),children:a.map(U=>x.jsx("option",{value:U.id,children:U.label},U.id))})]}),x.jsxs("div",{className:"section module-actions",children:[x.jsxs("button",{className:`delete-module-btn${f?" delete-module-btn--active":""}`,onClick:()=>h(!f),disabled:a.length<=1,title:a.length<=1?"Cannot delete — at least one module required":"Click a module in the viewport to delete it",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})}),f?"CANCEL DELETE":"DELETE MODULE"]}),x.jsxs("button",{className:"add-module-btn",onClick:()=>{var U;return d((U=Ee.computeFreeSpawn)==null?void 0:U.call(Ee))},title:"Add a new arm module to the scene",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M8 2v12M2 8h12",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round"})}),"ADD MODULE"]}),x.jsxs("button",{className:`connect-btn${p?" connect-btn--active":""}`,onClick:()=>{g(!p),v&&M(!1)},title:"Select end-faces on two modules to join them",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M5 8h6",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeDasharray:"2 1.5"})]}),p?"CANCEL CONNECT":"CONNECT MODULES"]}),x.jsxs("button",{className:`connect-btn disconnect-btn${v?" connect-btn--active disconnect-btn--active":""}`,onClick:()=>{M(!v),p&&g(!1)},title:"Click two modules to separate them",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M5.5 6.5l5-3M5.5 9.5l5 3",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]}),v?"CANCEL DISCONNECT":"DISCONNECT MODULES"]})]}),f&&x.jsxs("div",{className:"section connect-status disconnect-status",children:[x.jsx("div",{className:"section-title",children:"DELETE MODULE"}),x.jsx("p",{className:"connect-hint",children:"Click on any part of the module you want to delete in the 3D viewport."})]}),p&&x.jsxs("div",{className:"section connect-status",children:[x.jsx("div",{className:"section-title",children:"FACE SELECTION"}),x.jsx("p",{className:"connect-hint",children:"Click a square end-face on a module to select it. Two faces from different modules will join them."}),x.jsxs("div",{className:"face-slots",children:[x.jsxs("div",{className:`face-slot face-slot--1${y?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"FACE A"}),x.jsx("span",{className:"face-slot-value",children:y?`${((z=a.find(U=>U.id===y.moduleId))==null?void 0:z.label)??"?"} · ${y.faceKey}`:"not selected"})]}),x.jsxs("div",{className:`face-slot face-slot--2${m?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"FACE B"}),x.jsx("span",{className:"face-slot-value",children:m?`${((H=a.find(U=>U.id===m.moduleId))==null?void 0:H.label)??"?"} · ${m.faceKey}`:"not selected"})]})]}),u&&x.jsx("div",{className:"connect-error",children:u}),y&&x.jsx("button",{className:"clear-faces-btn",onClick:_,children:"CLEAR SELECTION"})]}),v&&x.jsxs("div",{className:"section connect-status disconnect-status",children:[x.jsx("div",{className:"section-title",children:"DISCONNECT SELECTION"}),x.jsx("p",{className:"connect-hint",children:"Click on any part of a module to select it. Select two different modules to separate them."}),x.jsxs("div",{className:"face-slots",children:[x.jsxs("div",{className:`face-slot face-slot--1${A?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"MOD A"}),x.jsx("span",{className:"face-slot-value",children:A?((X=a.find(U=>U.id===A))==null?void 0:X.label)??"?":"not selected"})]}),x.jsxs("div",{className:`face-slot face-slot--2${b?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"MOD B"}),x.jsx("span",{className:"face-slot-value",children:b?((ue=a.find(U=>U.id===b))==null?void 0:ue.label)??"?":"not selected"})]})]}),T&&x.jsx("div",{className:"connect-error",children:T}),A&&!b&&x.jsx("button",{className:"clear-faces-btn",onClick:N,children:"CLEAR SELECTION"})]}),x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:D}),x.jsxs("button",{className:"home-btn",onClick:r,title:"Reset arm to home position",children:[x.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 20 20",fill:"none",children:[x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"}),x.jsx("rect",{x:"8",y:"12",width:"4",height:"6",rx:"0.5",stroke:"currentColor",strokeWidth:"1.5",fill:"none"})]}),"HOME"]})]}),x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"FIXED ROOTS"}),x.jsx("div",{className:"root-grid",children:a.map((U,ee)=>{const ie=U.id===l?t:U.activeRootId,re=U.id===l;return x.jsxs("button",{className:`root-chip${re?" root-chip--active":""}`,onClick:()=>c(U.id),title:`${U.label} — root ${ie}${re?" (active)":""}`,children:[x.jsx("span",{className:"root-chip-dot"}),ie,"-M",ee+1]},U.id)})}),x.jsx("p",{className:"root-hint",children:"Click a rod in the viewport to set the active module’s root. Click a chip to switch active module."})]}),x.jsxs("div",{className:"section",children:[x.jsxs("button",{className:"section-collapse",onClick:()=>Z(U=>!U),children:[x.jsx("span",{className:"section-title",children:"JOINT TELEMETRY"}),x.jsx("span",{className:`collapse-arrow${J?" open":""}`,children:"▸"})]}),J&&x.jsx("div",{className:"joint-list",children:e.map((U,ee)=>x.jsx(uS,{joint:{...U,angle:U.angle*S(ee),velocity:U.velocity*S(ee),acceleration:U.acceleration*S(ee)},index:ee,rawAngle:i[ee]*S(ee),onArcDrag:(ie,re)=>s(ie,re*S(ie)),onJointHome:ie=>s(ie,0),onJointSet:(ie,re)=>s(ie,re*S(ie)),collision:o},ee))})]}),x.jsxs("div",{className:"instructions",children:[x.jsx("div",{className:"section-title",children:"CONTROLS"}),x.jsxs("ul",{children:[x.jsxs("li",{children:[x.jsx("kbd",{children:"Drag"})," any rod → arm follows cursor (IK)"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Click"})," a rod → set it as fixed root"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Connect"})," CONNECT MODULES, then click 2 faces"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Linked"})," drag a joined module → whole unit moves"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Arc"})," drag in a joint card to set its angle"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"ANG"})," type degrees, press Enter"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Scroll"})," zoom · ",x.jsx("kbd",{children:"RMB"})," orbit"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"MMB"})," / ",x.jsx("kbd",{children:"Shift+Drag"})," pan"]})]})]}),x.jsxs("div",{className:"panel-footer",children:[x.jsx("span",{children:"BEND 80–280°"}),x.jsx("span",{children:"TWIST 0–360°"}),x.jsxs("span",{children:[a.length," MODULE",a.length>1?"S":""," · 6 JOINTS"]})]})]})}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const wc="164",Rr={ROTATE:0,DOLLY:1,PAN:2},Yr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},fS=0,Up=1,hS=2,o_=1,a_=2,xi=3,hr=0,hn=1,Un=2,bi=0,Fs=1,Xd=2,Fp=3,Op=4,pS=5,Nr=100,mS=101,gS=102,vS=103,_S=104,xS=200,yS=201,MS=202,SS=203,$d=204,Yd=205,ES=206,wS=207,TS=208,AS=209,bS=210,CS=211,RS=212,PS=213,NS=214,LS=0,IS=1,DS=2,Kl=3,US=4,FS=5,OS=6,kS=7,l_=0,zS=1,BS=2,cr=0,c_=1,u_=2,d_=3,Kf=4,VS=5,f_=6,h_=7,p_=300,Ys=301,qs=302,qd=303,Kd=304,Tc=306,Zl=1e3,Zi=1001,Jl=1002,Sn=1003,m_=1004,No=1005,Fn=1006,Sl=1007,Ji=1008,pr=1009,HS=1010,GS=1011,g_=1012,v_=1013,Ks=1014,Qi=1015,ur=1016,__=1017,x_=1018,xa=1020,jS=35902,WS=1021,XS=1022,Zn=1023,$S=1024,YS=1025,Os=1026,ua=1027,qS=1028,y_=1029,KS=1030,M_=1031,S_=1033,ou=33776,au=33777,lu=33778,cu=33779,kp=35840,zp=35841,Bp=35842,Vp=35843,Hp=36196,Gp=37492,jp=37496,Wp=37808,Xp=37809,$p=37810,Yp=37811,qp=37812,Kp=37813,Zp=37814,Jp=37815,Qp=37816,em=37817,tm=37818,nm=37819,im=37820,rm=37821,uu=36492,sm=36494,om=36495,ZS=36283,am=36284,lm=36285,cm=36286,JS=2300,QS=2301,eE=3200,tE=3201,E_=0,nE=1,Si="",_n="srgb",xr="srgb-linear",Zf="display-p3",Ac="display-p3-linear",Ql="linear",lt="srgb",ec="rec709",tc="p3",qr=7680,um=519,iE=512,rE=513,sE=514,w_=515,oE=516,aE=517,lE=518,cE=519,dm=35044,fm="300 es",Ti=2e3,nc=2001;class Wr{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const Yt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let hm=1234567;const jo=Math.PI/180,da=180/Math.PI;function ro(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Yt[n&255]+Yt[n>>8&255]+Yt[n>>16&255]+Yt[n>>24&255]+"-"+Yt[e&255]+Yt[e>>8&255]+"-"+Yt[e>>16&15|64]+Yt[e>>24&255]+"-"+Yt[t&63|128]+Yt[t>>8&255]+"-"+Yt[t>>16&255]+Yt[t>>24&255]+Yt[i&255]+Yt[i>>8&255]+Yt[i>>16&255]+Yt[i>>24&255]).toLowerCase()}function Zt(n,e,t){return Math.max(e,Math.min(t,n))}function Jf(n,e){return(n%e+e)%e}function uE(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function dE(n,e,t){return n!==e?(t-n)/(e-n):0}function Wo(n,e,t){return(1-t)*n+t*e}function fE(n,e,t,i){return Wo(n,e,1-Math.exp(-t*i))}function hE(n,e=1){return e-Math.abs(Jf(n,e*2)-e)}function pE(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function mE(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function gE(n,e){return n+Math.floor(Math.random()*(e-n+1))}function vE(n,e){return n+Math.random()*(e-n)}function _E(n){return n*(.5-Math.random())}function xE(n){n!==void 0&&(hm=n);let e=hm+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function yE(n){return n*jo}function ME(n){return n*da}function SE(n){return(n&n-1)===0&&n!==0}function EE(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function wE(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function TE(n,e,t,i,r){const s=Math.cos,o=Math.sin,a=s(t/2),l=o(t/2),c=s((e+i)/2),d=o((e+i)/2),f=s((e-i)/2),h=o((e-i)/2),p=s((i-e)/2),g=o((i-e)/2);switch(r){case"XYX":n.set(a*d,l*f,l*h,a*c);break;case"YZY":n.set(l*h,a*d,l*f,a*c);break;case"ZXZ":n.set(l*f,l*h,a*d,a*c);break;case"XZX":n.set(a*d,l*g,l*p,a*c);break;case"YXY":n.set(l*p,a*d,l*g,a*c);break;case"ZYZ":n.set(l*g,l*p,a*d,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function ms(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function tn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Zs={DEG2RAD:jo,RAD2DEG:da,generateUUID:ro,clamp:Zt,euclideanModulo:Jf,mapLinear:uE,inverseLerp:dE,lerp:Wo,damp:fE,pingpong:hE,smoothstep:pE,smootherstep:mE,randInt:gE,randFloat:vE,randFloatSpread:_E,seededRandom:xE,degToRad:yE,radToDeg:ME,isPowerOfTwo:SE,ceilPowerOfTwo:EE,floorPowerOfTwo:wE,setQuaternionFromProperEuler:TE,normalize:tn,denormalize:ms};class Me{constructor(e=0,t=0){Me.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Zt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Be{constructor(e,t,i,r,s,o,a,l,c){Be.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c)}set(e,t,i,r,s,o,a,l,c){const d=this.elements;return d[0]=e,d[1]=r,d[2]=a,d[3]=t,d[4]=s,d[5]=l,d[6]=i,d[7]=o,d[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],d=i[4],f=i[7],h=i[2],p=i[5],g=i[8],y=r[0],m=r[3],u=r[6],_=r[1],v=r[4],M=r[7],A=r[2],b=r[5],T=r[8];return s[0]=o*y+a*_+l*A,s[3]=o*m+a*v+l*b,s[6]=o*u+a*M+l*T,s[1]=c*y+d*_+f*A,s[4]=c*m+d*v+f*b,s[7]=c*u+d*M+f*T,s[2]=h*y+p*_+g*A,s[5]=h*m+p*v+g*b,s[8]=h*u+p*M+g*T,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],d=e[8];return t*o*d-t*a*c-i*s*d+i*a*l+r*s*c-r*o*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],d=e[8],f=d*o-a*c,h=a*l-d*s,p=c*s-o*l,g=t*f+i*h+r*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const y=1/g;return e[0]=f*y,e[1]=(r*c-d*i)*y,e[2]=(a*i-r*o)*y,e[3]=h*y,e[4]=(d*t-r*l)*y,e[5]=(r*s-a*t)*y,e[6]=p*y,e[7]=(i*l-c*t)*y,e[8]=(o*t-i*s)*y,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(du.makeScale(e,t)),this}rotate(e){return this.premultiply(du.makeRotation(-e)),this}translate(e,t){return this.premultiply(du.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const du=new Be;function T_(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function ic(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function AE(){const n=ic("canvas");return n.style.display="block",n}const pm={};function bE(n){n in pm||(pm[n]=!0,console.warn(n))}const mm=new Be().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),gm=new Be().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),za={[xr]:{transfer:Ql,primaries:ec,toReference:n=>n,fromReference:n=>n},[_n]:{transfer:lt,primaries:ec,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[Ac]:{transfer:Ql,primaries:tc,toReference:n=>n.applyMatrix3(gm),fromReference:n=>n.applyMatrix3(mm)},[Zf]:{transfer:lt,primaries:tc,toReference:n=>n.convertSRGBToLinear().applyMatrix3(gm),fromReference:n=>n.applyMatrix3(mm).convertLinearToSRGB()}},CE=new Set([xr,Ac]),st={enabled:!0,_workingColorSpace:xr,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!CE.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;const i=za[e].toReference,r=za[t].fromReference;return r(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return za[n].primaries},getTransfer:function(n){return n===Si?Ql:za[n].transfer}};function ks(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function fu(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Kr;class RE{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Kr===void 0&&(Kr=ic("canvas")),Kr.width=e.width,Kr.height=e.height;const i=Kr.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=Kr}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ic("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=ks(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(ks(t[i]/255)*255):t[i]=ks(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let PE=0;class Qf{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:PE++}),this.uuid=ro(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(hu(r[o].image)):s.push(hu(r[o]))}else s=hu(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function hu(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?RE.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let NE=0;class Qt extends Wr{constructor(e=Qt.DEFAULT_IMAGE,t=Qt.DEFAULT_MAPPING,i=Zi,r=Zi,s=Fn,o=Ji,a=Zn,l=pr,c=Qt.DEFAULT_ANISOTROPY,d=Si){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:NE++}),this.uuid=ro(),this.name="",this.source=new Qf(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Me(0,0),this.repeat=new Me(1,1),this.center=new Me(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Be,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==p_)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Zl:e.x=e.x-Math.floor(e.x);break;case Zi:e.x=e.x<0?0:1;break;case Jl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Zl:e.y=e.y-Math.floor(e.y);break;case Zi:e.y=e.y<0?0:1;break;case Jl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Qt.DEFAULT_IMAGE=null;Qt.DEFAULT_MAPPING=p_;Qt.DEFAULT_ANISOTROPY=1;class Ut{constructor(e=0,t=0,i=0,r=1){Ut.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],d=l[4],f=l[8],h=l[1],p=l[5],g=l[9],y=l[2],m=l[6],u=l[10];if(Math.abs(d-h)<.01&&Math.abs(f-y)<.01&&Math.abs(g-m)<.01){if(Math.abs(d+h)<.1&&Math.abs(f+y)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+u-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(c+1)/2,M=(p+1)/2,A=(u+1)/2,b=(d+h)/4,T=(f+y)/4,N=(g+m)/4;return v>M&&v>A?v<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(v),r=b/i,s=T/i):M>A?M<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(M),i=b/r,s=N/r):A<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(A),i=T/s,r=N/s),this.set(i,r,s,t),this}let _=Math.sqrt((m-g)*(m-g)+(f-y)*(f-y)+(h-d)*(h-d));return Math.abs(_)<.001&&(_=1),this.x=(m-g)/_,this.y=(f-y)/_,this.z=(h-d)/_,this.w=Math.acos((c+p+u-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class LE extends Wr{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Ut(0,0,e,t),this.scissorTest=!1,this.viewport=new Ut(0,0,e,t);const r={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Fn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new Qt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,r=e.textures.length;i<r;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new Qf(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ei extends LE{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class A_ extends Qt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Sn,this.minFilter=Sn,this.wrapR=Zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class IE extends Qt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Sn,this.minFilter=Sn,this.wrapR=Zi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Jt{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let l=i[r+0],c=i[r+1],d=i[r+2],f=i[r+3];const h=s[o+0],p=s[o+1],g=s[o+2],y=s[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=d,e[t+3]=f;return}if(a===1){e[t+0]=h,e[t+1]=p,e[t+2]=g,e[t+3]=y;return}if(f!==y||l!==h||c!==p||d!==g){let m=1-a;const u=l*h+c*p+d*g+f*y,_=u>=0?1:-1,v=1-u*u;if(v>Number.EPSILON){const A=Math.sqrt(v),b=Math.atan2(A,u*_);m=Math.sin(m*b)/A,a=Math.sin(a*b)/A}const M=a*_;if(l=l*m+h*M,c=c*m+p*M,d=d*m+g*M,f=f*m+y*M,m===1-a){const A=1/Math.sqrt(l*l+c*c+d*d+f*f);l*=A,c*=A,d*=A,f*=A}}e[t]=l,e[t+1]=c,e[t+2]=d,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,r,s,o){const a=i[r],l=i[r+1],c=i[r+2],d=i[r+3],f=s[o],h=s[o+1],p=s[o+2],g=s[o+3];return e[t]=a*g+d*f+l*p-c*h,e[t+1]=l*g+d*h+c*f-a*p,e[t+2]=c*g+d*p+a*h-l*f,e[t+3]=d*g-a*f-l*h-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),d=a(r/2),f=a(s/2),h=l(i/2),p=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=h*d*f+c*p*g,this._y=c*p*f-h*d*g,this._z=c*d*g+h*p*f,this._w=c*d*f-h*p*g;break;case"YXZ":this._x=h*d*f+c*p*g,this._y=c*p*f-h*d*g,this._z=c*d*g-h*p*f,this._w=c*d*f+h*p*g;break;case"ZXY":this._x=h*d*f-c*p*g,this._y=c*p*f+h*d*g,this._z=c*d*g+h*p*f,this._w=c*d*f-h*p*g;break;case"ZYX":this._x=h*d*f-c*p*g,this._y=c*p*f+h*d*g,this._z=c*d*g-h*p*f,this._w=c*d*f+h*p*g;break;case"YZX":this._x=h*d*f+c*p*g,this._y=c*p*f+h*d*g,this._z=c*d*g-h*p*f,this._w=c*d*f-h*p*g;break;case"XZY":this._x=h*d*f-c*p*g,this._y=c*p*f-h*d*g,this._z=c*d*g+h*p*f,this._w=c*d*f+h*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],d=t[6],f=t[10],h=i+a+f;if(h>0){const p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(d-l)*p,this._y=(s-c)*p,this._z=(o-r)*p}else if(i>a&&i>f){const p=2*Math.sqrt(1+i-a-f);this._w=(d-l)/p,this._x=.25*p,this._y=(r+o)/p,this._z=(s+c)/p}else if(a>f){const p=2*Math.sqrt(1+a-i-f);this._w=(s-c)/p,this._x=(r+o)/p,this._y=.25*p,this._z=(l+d)/p}else{const p=2*Math.sqrt(1+f-i-a);this._w=(o-r)/p,this._x=(s+c)/p,this._y=(l+d)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Zt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,d=t._w;return this._x=i*d+o*a+r*c-s*l,this._y=r*d+o*l+s*a-i*c,this._z=s*d+o*c+i*l-r*a,this._w=o*d-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const p=1-t;return this._w=p*o+t*this._w,this._x=p*i+t*this._x,this._y=p*r+t*this._y,this._z=p*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),d=Math.atan2(c,a),f=Math.sin((1-t)*d)/c,h=Math.sin(t*d)/c;return this._w=o*f+this._w*h,this._x=i*f+this._x*h,this._y=r*f+this._y*h,this._z=s*f+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class O{constructor(e=0,t=0,i=0){O.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(vm.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(vm.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*i),d=2*(a*t-s*r),f=2*(s*i-o*t);return this.x=t+l*c+o*f-a*d,this.y=i+l*d+a*c-s*f,this.z=r+l*f+s*d-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return pu.copy(this).projectOnVector(e),this.sub(pu)}reflect(e){return this.sub(pu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Zt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const pu=new O,vm=new Jt;class Dn{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Gn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Gn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Gn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Gn):Gn.fromBufferAttribute(s,o),Gn.applyMatrix4(e.matrixWorld),this.expandByPoint(Gn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ba.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ba.copy(i.boundingBox)),Ba.applyMatrix4(e.matrixWorld),this.union(Ba)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Gn),Gn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(xo),Va.subVectors(this.max,xo),Zr.subVectors(e.a,xo),Jr.subVectors(e.b,xo),Qr.subVectors(e.c,xo),ki.subVectors(Jr,Zr),zi.subVectors(Qr,Jr),Mr.subVectors(Zr,Qr);let t=[0,-ki.z,ki.y,0,-zi.z,zi.y,0,-Mr.z,Mr.y,ki.z,0,-ki.x,zi.z,0,-zi.x,Mr.z,0,-Mr.x,-ki.y,ki.x,0,-zi.y,zi.x,0,-Mr.y,Mr.x,0];return!mu(t,Zr,Jr,Qr,Va)||(t=[1,0,0,0,1,0,0,0,1],!mu(t,Zr,Jr,Qr,Va))?!1:(Ha.crossVectors(ki,zi),t=[Ha.x,Ha.y,Ha.z],mu(t,Zr,Jr,Qr,Va))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Gn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Gn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(hi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),hi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),hi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),hi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),hi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),hi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),hi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),hi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(hi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const hi=[new O,new O,new O,new O,new O,new O,new O,new O],Gn=new O,Ba=new Dn,Zr=new O,Jr=new O,Qr=new O,ki=new O,zi=new O,Mr=new O,xo=new O,Va=new O,Ha=new O,Sr=new O;function mu(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){Sr.fromArray(n,s);const a=r.x*Math.abs(Sr.x)+r.y*Math.abs(Sr.y)+r.z*Math.abs(Sr.z),l=e.dot(Sr),c=t.dot(Sr),d=i.dot(Sr);if(Math.max(-Math.max(l,c,d),Math.min(l,c,d))>a)return!1}return!0}const DE=new Dn,yo=new O,gu=new O;class eh{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):DE.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yo.subVectors(e,this.center);const t=yo.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(yo,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(gu.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yo.copy(e.center).add(gu)),this.expandByPoint(yo.copy(e.center).sub(gu))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const pi=new O,vu=new O,Ga=new O,Bi=new O,_u=new O,ja=new O,xu=new O;class th{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,pi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=pi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(pi.copy(this.origin).addScaledVector(this.direction,t),pi.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){vu.copy(e).add(t).multiplyScalar(.5),Ga.copy(t).sub(e).normalize(),Bi.copy(this.origin).sub(vu);const s=e.distanceTo(t)*.5,o=-this.direction.dot(Ga),a=Bi.dot(this.direction),l=-Bi.dot(Ga),c=Bi.lengthSq(),d=Math.abs(1-o*o);let f,h,p,g;if(d>0)if(f=o*l-a,h=o*a-l,g=s*d,f>=0)if(h>=-g)if(h<=g){const y=1/d;f*=y,h*=y,p=f*(f+o*h+2*a)+h*(o*f+h+2*l)+c}else h=s,f=Math.max(0,-(o*h+a)),p=-f*f+h*(h+2*l)+c;else h=-s,f=Math.max(0,-(o*h+a)),p=-f*f+h*(h+2*l)+c;else h<=-g?(f=Math.max(0,-(-o*s+a)),h=f>0?-s:Math.min(Math.max(-s,-l),s),p=-f*f+h*(h+2*l)+c):h<=g?(f=0,h=Math.min(Math.max(-s,-l),s),p=h*(h+2*l)+c):(f=Math.max(0,-(o*s+a)),h=f>0?s:Math.min(Math.max(-s,-l),s),p=-f*f+h*(h+2*l)+c);else h=o>0?-s:s,f=Math.max(0,-(o*h+a)),p=-f*f+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),r&&r.copy(vu).addScaledVector(Ga,h),p}intersectSphere(e,t){pi.subVectors(e.center,this.origin);const i=pi.dot(this.direction),r=pi.dot(pi)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,l;const c=1/this.direction.x,d=1/this.direction.y,f=1/this.direction.z,h=this.origin;return c>=0?(i=(e.min.x-h.x)*c,r=(e.max.x-h.x)*c):(i=(e.max.x-h.x)*c,r=(e.min.x-h.x)*c),d>=0?(s=(e.min.y-h.y)*d,o=(e.max.y-h.y)*d):(s=(e.max.y-h.y)*d,o=(e.min.y-h.y)*d),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),f>=0?(a=(e.min.z-h.z)*f,l=(e.max.z-h.z)*f):(a=(e.max.z-h.z)*f,l=(e.min.z-h.z)*f),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,pi)!==null}intersectTriangle(e,t,i,r,s){_u.subVectors(t,e),ja.subVectors(i,e),xu.crossVectors(_u,ja);let o=this.direction.dot(xu),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Bi.subVectors(this.origin,e);const l=a*this.direction.dot(ja.crossVectors(Bi,ja));if(l<0)return null;const c=a*this.direction.dot(_u.cross(Bi));if(c<0||l+c>o)return null;const d=-a*Bi.dot(xu);return d<0?null:this.at(d/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Qe{constructor(e,t,i,r,s,o,a,l,c,d,f,h,p,g,y,m){Qe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c,d,f,h,p,g,y,m)}set(e,t,i,r,s,o,a,l,c,d,f,h,p,g,y,m){const u=this.elements;return u[0]=e,u[4]=t,u[8]=i,u[12]=r,u[1]=s,u[5]=o,u[9]=a,u[13]=l,u[2]=c,u[6]=d,u[10]=f,u[14]=h,u[3]=p,u[7]=g,u[11]=y,u[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Qe().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/es.setFromMatrixColumn(e,0).length(),s=1/es.setFromMatrixColumn(e,1).length(),o=1/es.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),d=Math.cos(s),f=Math.sin(s);if(e.order==="XYZ"){const h=o*d,p=o*f,g=a*d,y=a*f;t[0]=l*d,t[4]=-l*f,t[8]=c,t[1]=p+g*c,t[5]=h-y*c,t[9]=-a*l,t[2]=y-h*c,t[6]=g+p*c,t[10]=o*l}else if(e.order==="YXZ"){const h=l*d,p=l*f,g=c*d,y=c*f;t[0]=h+y*a,t[4]=g*a-p,t[8]=o*c,t[1]=o*f,t[5]=o*d,t[9]=-a,t[2]=p*a-g,t[6]=y+h*a,t[10]=o*l}else if(e.order==="ZXY"){const h=l*d,p=l*f,g=c*d,y=c*f;t[0]=h-y*a,t[4]=-o*f,t[8]=g+p*a,t[1]=p+g*a,t[5]=o*d,t[9]=y-h*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const h=o*d,p=o*f,g=a*d,y=a*f;t[0]=l*d,t[4]=g*c-p,t[8]=h*c+y,t[1]=l*f,t[5]=y*c+h,t[9]=p*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const h=o*l,p=o*c,g=a*l,y=a*c;t[0]=l*d,t[4]=y-h*f,t[8]=g*f+p,t[1]=f,t[5]=o*d,t[9]=-a*d,t[2]=-c*d,t[6]=p*f+g,t[10]=h-y*f}else if(e.order==="XZY"){const h=o*l,p=o*c,g=a*l,y=a*c;t[0]=l*d,t[4]=-f,t[8]=c*d,t[1]=h*f+y,t[5]=o*d,t[9]=p*f-g,t[2]=g*f-p,t[6]=a*d,t[10]=y*f+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(UE,e,FE)}lookAt(e,t,i){const r=this.elements;return mn.subVectors(e,t),mn.lengthSq()===0&&(mn.z=1),mn.normalize(),Vi.crossVectors(i,mn),Vi.lengthSq()===0&&(Math.abs(i.z)===1?mn.x+=1e-4:mn.z+=1e-4,mn.normalize(),Vi.crossVectors(i,mn)),Vi.normalize(),Wa.crossVectors(mn,Vi),r[0]=Vi.x,r[4]=Wa.x,r[8]=mn.x,r[1]=Vi.y,r[5]=Wa.y,r[9]=mn.y,r[2]=Vi.z,r[6]=Wa.z,r[10]=mn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],d=i[1],f=i[5],h=i[9],p=i[13],g=i[2],y=i[6],m=i[10],u=i[14],_=i[3],v=i[7],M=i[11],A=i[15],b=r[0],T=r[4],N=r[8],w=r[12],S=r[1],D=r[5],V=r[9],I=r[13],G=r[2],B=r[6],J=r[10],Z=r[14],P=r[3],k=r[7],z=r[11],H=r[15];return s[0]=o*b+a*S+l*G+c*P,s[4]=o*T+a*D+l*B+c*k,s[8]=o*N+a*V+l*J+c*z,s[12]=o*w+a*I+l*Z+c*H,s[1]=d*b+f*S+h*G+p*P,s[5]=d*T+f*D+h*B+p*k,s[9]=d*N+f*V+h*J+p*z,s[13]=d*w+f*I+h*Z+p*H,s[2]=g*b+y*S+m*G+u*P,s[6]=g*T+y*D+m*B+u*k,s[10]=g*N+y*V+m*J+u*z,s[14]=g*w+y*I+m*Z+u*H,s[3]=_*b+v*S+M*G+A*P,s[7]=_*T+v*D+M*B+A*k,s[11]=_*N+v*V+M*J+A*z,s[15]=_*w+v*I+M*Z+A*H,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],d=e[2],f=e[6],h=e[10],p=e[14],g=e[3],y=e[7],m=e[11],u=e[15];return g*(+s*l*f-r*c*f-s*a*h+i*c*h+r*a*p-i*l*p)+y*(+t*l*p-t*c*h+s*o*h-r*o*p+r*c*d-s*l*d)+m*(+t*c*f-t*a*p-s*o*f+i*o*p+s*a*d-i*c*d)+u*(-r*a*d-t*l*f+t*a*h+r*o*f-i*o*h+i*l*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],d=e[8],f=e[9],h=e[10],p=e[11],g=e[12],y=e[13],m=e[14],u=e[15],_=f*m*c-y*h*c+y*l*p-a*m*p-f*l*u+a*h*u,v=g*h*c-d*m*c-g*l*p+o*m*p+d*l*u-o*h*u,M=d*y*c-g*f*c+g*a*p-o*y*p-d*a*u+o*f*u,A=g*f*l-d*y*l-g*a*h+o*y*h+d*a*m-o*f*m,b=t*_+i*v+r*M+s*A;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/b;return e[0]=_*T,e[1]=(y*h*s-f*m*s-y*r*p+i*m*p+f*r*u-i*h*u)*T,e[2]=(a*m*s-y*l*s+y*r*c-i*m*c-a*r*u+i*l*u)*T,e[3]=(f*l*s-a*h*s-f*r*c+i*h*c+a*r*p-i*l*p)*T,e[4]=v*T,e[5]=(d*m*s-g*h*s+g*r*p-t*m*p-d*r*u+t*h*u)*T,e[6]=(g*l*s-o*m*s-g*r*c+t*m*c+o*r*u-t*l*u)*T,e[7]=(o*h*s-d*l*s+d*r*c-t*h*c-o*r*p+t*l*p)*T,e[8]=M*T,e[9]=(g*f*s-d*y*s-g*i*p+t*y*p+d*i*u-t*f*u)*T,e[10]=(o*y*s-g*a*s+g*i*c-t*y*c-o*i*u+t*a*u)*T,e[11]=(d*a*s-o*f*s-d*i*c+t*f*c+o*i*p-t*a*p)*T,e[12]=A*T,e[13]=(d*y*r-g*f*r+g*i*h-t*y*h-d*i*m+t*f*m)*T,e[14]=(g*a*r-o*y*r-g*i*l+t*y*l+o*i*m-t*a*m)*T,e[15]=(o*f*r-d*a*r+d*i*l-t*f*l-o*i*h+t*a*h)*T,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,l=e.z,c=s*o,d=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,d*a+i,d*l-r*o,0,c*l-r*a,d*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,d=o+o,f=a+a,h=s*c,p=s*d,g=s*f,y=o*d,m=o*f,u=a*f,_=l*c,v=l*d,M=l*f,A=i.x,b=i.y,T=i.z;return r[0]=(1-(y+u))*A,r[1]=(p+M)*A,r[2]=(g-v)*A,r[3]=0,r[4]=(p-M)*b,r[5]=(1-(h+u))*b,r[6]=(m+_)*b,r[7]=0,r[8]=(g+v)*T,r[9]=(m-_)*T,r[10]=(1-(h+y))*T,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=es.set(r[0],r[1],r[2]).length();const o=es.set(r[4],r[5],r[6]).length(),a=es.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],jn.copy(this);const c=1/s,d=1/o,f=1/a;return jn.elements[0]*=c,jn.elements[1]*=c,jn.elements[2]*=c,jn.elements[4]*=d,jn.elements[5]*=d,jn.elements[6]*=d,jn.elements[8]*=f,jn.elements[9]*=f,jn.elements[10]*=f,t.setFromRotationMatrix(jn),i.x=s,i.y=o,i.z=a,this}makePerspective(e,t,i,r,s,o,a=Ti){const l=this.elements,c=2*s/(t-e),d=2*s/(i-r),f=(t+e)/(t-e),h=(i+r)/(i-r);let p,g;if(a===Ti)p=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===nc)p=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=d,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=Ti){const l=this.elements,c=1/(t-e),d=1/(i-r),f=1/(o-s),h=(t+e)*c,p=(i+r)*d;let g,y;if(a===Ti)g=(o+s)*f,y=-2*f;else if(a===nc)g=s*f,y=-1*f;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-h,l[1]=0,l[5]=2*d,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=y,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const es=new O,jn=new Qe,UE=new O(0,0,0),FE=new O(1,1,1),Vi=new O,Wa=new O,mn=new O,_m=new Qe,xm=new Jt;class ui{constructor(e=0,t=0,i=0,r=ui.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],d=r[9],f=r[2],h=r[6],p=r[10];switch(t){case"XYZ":this._y=Math.asin(Zt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-d,p),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Zt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,s),this._z=0);break;case"ZXY":this._x=Math.asin(Zt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-f,p),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Zt(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Zt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-d,c),this._y=Math.atan2(-f,s)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Zt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-d,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return _m.makeRotationFromQuaternion(e),this.setFromRotationMatrix(_m,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xm.setFromEuler(this),this.setFromQuaternion(xm,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}ui.DEFAULT_ORDER="XYZ";class nh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let OE=0;const ym=new O,ts=new Jt,mi=new Qe,Xa=new O,Mo=new O,kE=new O,zE=new Jt,Mm=new O(1,0,0),Sm=new O(0,1,0),Em=new O(0,0,1),wm={type:"added"},BE={type:"removed"},ns={type:"childadded",child:null},yu={type:"childremoved",child:null};class Ot extends Wr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:OE++}),this.uuid=ro(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ot.DEFAULT_UP.clone();const e=new O,t=new ui,i=new Jt,r=new O(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Qe},normalMatrix:{value:new Be}}),this.matrix=new Qe,this.matrixWorld=new Qe,this.matrixAutoUpdate=Ot.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new nh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ts.setFromAxisAngle(e,t),this.quaternion.multiply(ts),this}rotateOnWorldAxis(e,t){return ts.setFromAxisAngle(e,t),this.quaternion.premultiply(ts),this}rotateX(e){return this.rotateOnAxis(Mm,e)}rotateY(e){return this.rotateOnAxis(Sm,e)}rotateZ(e){return this.rotateOnAxis(Em,e)}translateOnAxis(e,t){return ym.copy(e).applyQuaternion(this.quaternion),this.position.add(ym.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Mm,e)}translateY(e){return this.translateOnAxis(Sm,e)}translateZ(e){return this.translateOnAxis(Em,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(mi.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Xa.copy(e):Xa.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),Mo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?mi.lookAt(Mo,Xa,this.up):mi.lookAt(Xa,Mo,this.up),this.quaternion.setFromRotationMatrix(mi),r&&(mi.extractRotation(r.matrixWorld),ts.setFromRotationMatrix(mi),this.quaternion.premultiply(ts.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(wm),ns.child=e,this.dispatchEvent(ns),ns.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(BE),yu.child=e,this.dispatchEvent(yu),yu.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),mi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),mi.multiply(e.parent.matrixWorld)),e.applyMatrix4(mi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(wm),ns.child=e,this.dispatchEvent(ns),ns.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mo,e,kE),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mo,zE,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++){const s=t[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++){const a=r[s];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,d=l.length;c<d;c++){const f=l[c];s(e.shapes,f)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),d=o(e.images),f=o(e.shapes),h=o(e.skeletons),p=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),d.length>0&&(i.images=d),f.length>0&&(i.shapes=f),h.length>0&&(i.skeletons=h),p.length>0&&(i.animations=p),g.length>0&&(i.nodes=g)}return i.object=r,i;function o(a){const l=[];for(const c in a){const d=a[c];delete d.metadata,l.push(d)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Ot.DEFAULT_UP=new O(0,1,0);Ot.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Wn=new O,gi=new O,Mu=new O,vi=new O,is=new O,rs=new O,Tm=new O,Su=new O,Eu=new O,wu=new O;class ai{constructor(e=new O,t=new O,i=new O){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Wn.subVectors(e,t),r.cross(Wn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Wn.subVectors(r,t),gi.subVectors(i,t),Mu.subVectors(e,t);const o=Wn.dot(Wn),a=Wn.dot(gi),l=Wn.dot(Mu),c=gi.dot(gi),d=gi.dot(Mu),f=o*c-a*a;if(f===0)return s.set(0,0,0),null;const h=1/f,p=(c*l-a*d)*h,g=(o*d-a*l)*h;return s.set(1-p-g,g,p)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,vi)===null?!1:vi.x>=0&&vi.y>=0&&vi.x+vi.y<=1}static getInterpolation(e,t,i,r,s,o,a,l){return this.getBarycoord(e,t,i,r,vi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,vi.x),l.addScaledVector(o,vi.y),l.addScaledVector(a,vi.z),l)}static isFrontFacing(e,t,i,r){return Wn.subVectors(i,t),gi.subVectors(e,t),Wn.cross(gi).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wn.subVectors(this.c,this.b),gi.subVectors(this.a,this.b),Wn.cross(gi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return ai.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return ai.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return ai.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return ai.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return ai.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let o,a;is.subVectors(r,i),rs.subVectors(s,i),Su.subVectors(e,i);const l=is.dot(Su),c=rs.dot(Su);if(l<=0&&c<=0)return t.copy(i);Eu.subVectors(e,r);const d=is.dot(Eu),f=rs.dot(Eu);if(d>=0&&f<=d)return t.copy(r);const h=l*f-d*c;if(h<=0&&l>=0&&d<=0)return o=l/(l-d),t.copy(i).addScaledVector(is,o);wu.subVectors(e,s);const p=is.dot(wu),g=rs.dot(wu);if(g>=0&&p<=g)return t.copy(s);const y=p*c-l*g;if(y<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(i).addScaledVector(rs,a);const m=d*g-p*f;if(m<=0&&f-d>=0&&p-g>=0)return Tm.subVectors(s,r),a=(f-d)/(f-d+(p-g)),t.copy(r).addScaledVector(Tm,a);const u=1/(m+y+h);return o=y*u,a=h*u,t.copy(i).addScaledVector(is,o).addScaledVector(rs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const b_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Hi={h:0,s:0,l:0},$a={h:0,s:0,l:0};function Tu(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Ve{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=_n){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,st.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=st.workingColorSpace){return this.r=e,this.g=t,this.b=i,st.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=st.workingColorSpace){if(e=Jf(e,1),t=Zt(t,0,1),i=Zt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=Tu(o,s,e+1/3),this.g=Tu(o,s,e),this.b=Tu(o,s,e-1/3)}return st.toWorkingColorSpace(this,r),this}setStyle(e,t=_n){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=_n){const i=b_[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ks(e.r),this.g=ks(e.g),this.b=ks(e.b),this}copyLinearToSRGB(e){return this.r=fu(e.r),this.g=fu(e.g),this.b=fu(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=_n){return st.fromWorkingColorSpace(qt.copy(this),e),Math.round(Zt(qt.r*255,0,255))*65536+Math.round(Zt(qt.g*255,0,255))*256+Math.round(Zt(qt.b*255,0,255))}getHexString(e=_n){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=st.workingColorSpace){st.fromWorkingColorSpace(qt.copy(this),t);const i=qt.r,r=qt.g,s=qt.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let l,c;const d=(a+o)/2;if(a===o)l=0,c=0;else{const f=o-a;switch(c=d<=.5?f/(o+a):f/(2-o-a),o){case i:l=(r-s)/f+(r<s?6:0);break;case r:l=(s-i)/f+2;break;case s:l=(i-r)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=d,e}getRGB(e,t=st.workingColorSpace){return st.fromWorkingColorSpace(qt.copy(this),t),e.r=qt.r,e.g=qt.g,e.b=qt.b,e}getStyle(e=_n){st.fromWorkingColorSpace(qt.copy(this),e);const t=qt.r,i=qt.g,r=qt.b;return e!==_n?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(Hi),this.setHSL(Hi.h+e,Hi.s+t,Hi.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Hi),e.getHSL($a);const i=Wo(Hi.h,$a.h,t),r=Wo(Hi.s,$a.s,t),s=Wo(Hi.l,$a.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const qt=new Ve;Ve.NAMES=b_;let VE=0;class ya extends Wr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:VE++}),this.uuid=ro(),this.name="",this.type="Material",this.blending=Fs,this.side=hr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=$d,this.blendDst=Yd,this.blendEquation=Nr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ve(0,0,0),this.blendAlpha=0,this.depthFunc=Kl,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=um,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qr,this.stencilZFail=qr,this.stencilZPass=qr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Fs&&(i.blending=this.blending),this.side!==hr&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==$d&&(i.blendSrc=this.blendSrc),this.blendDst!==Yd&&(i.blendDst=this.blendDst),this.blendEquation!==Nr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Kl&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==um&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==qr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==qr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==qr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class bc extends ya{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ve(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ui,this.combine=l_,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Tt=new O,Ya=new Me;class Bt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=dm,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=Qi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return bE("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Ya.fromBufferAttribute(this,t),Ya.applyMatrix3(e),this.setXY(t,Ya.x,Ya.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=ms(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=tn(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=ms(t,this.array)),t}setX(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=ms(t,this.array)),t}setY(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=ms(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=ms(t,this.array)),t}setW(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array),s=tn(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==dm&&(e.usage=this.usage),e}}class C_ extends Bt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class R_ extends Bt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class kt extends Bt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let HE=0;const Pn=new Qe,Au=new Ot,ss=new O,gn=new Dn,So=new Dn,It=new O;class ni extends Wr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:HE++}),this.uuid=ro(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(T_(e)?R_:C_)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Be().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Pn.makeRotationFromQuaternion(e),this.applyMatrix4(Pn),this}rotateX(e){return Pn.makeRotationX(e),this.applyMatrix4(Pn),this}rotateY(e){return Pn.makeRotationY(e),this.applyMatrix4(Pn),this}rotateZ(e){return Pn.makeRotationZ(e),this.applyMatrix4(Pn),this}translate(e,t,i){return Pn.makeTranslation(e,t,i),this.applyMatrix4(Pn),this}scale(e,t,i){return Pn.makeScale(e,t,i),this.applyMatrix4(Pn),this}lookAt(e){return Au.lookAt(e),Au.updateMatrix(),this.applyMatrix4(Au.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ss).negate(),this.translate(ss.x,ss.y,ss.z),this}setFromPoints(e){const t=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new kt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Dn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];gn.setFromBufferAttribute(s),this.morphTargetsRelative?(It.addVectors(this.boundingBox.min,gn.min),this.boundingBox.expandByPoint(It),It.addVectors(this.boundingBox.max,gn.max),this.boundingBox.expandByPoint(It)):(this.boundingBox.expandByPoint(gn.min),this.boundingBox.expandByPoint(gn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new eh);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){const i=this.boundingSphere.center;if(gn.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];So.setFromBufferAttribute(a),this.morphTargetsRelative?(It.addVectors(gn.min,So.min),gn.expandByPoint(It),It.addVectors(gn.max,So.max),gn.expandByPoint(It)):(gn.expandByPoint(So.min),gn.expandByPoint(So.max))}gn.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)It.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(It));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,d=a.count;c<d;c++)It.fromBufferAttribute(a,c),l&&(ss.fromBufferAttribute(e,c),It.add(ss)),r=Math.max(r,i.distanceToSquared(It))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Bt(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let N=0;N<i.count;N++)a[N]=new O,l[N]=new O;const c=new O,d=new O,f=new O,h=new Me,p=new Me,g=new Me,y=new O,m=new O;function u(N,w,S){c.fromBufferAttribute(i,N),d.fromBufferAttribute(i,w),f.fromBufferAttribute(i,S),h.fromBufferAttribute(s,N),p.fromBufferAttribute(s,w),g.fromBufferAttribute(s,S),d.sub(c),f.sub(c),p.sub(h),g.sub(h);const D=1/(p.x*g.y-g.x*p.y);isFinite(D)&&(y.copy(d).multiplyScalar(g.y).addScaledVector(f,-p.y).multiplyScalar(D),m.copy(f).multiplyScalar(p.x).addScaledVector(d,-g.x).multiplyScalar(D),a[N].add(y),a[w].add(y),a[S].add(y),l[N].add(m),l[w].add(m),l[S].add(m))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let N=0,w=_.length;N<w;++N){const S=_[N],D=S.start,V=S.count;for(let I=D,G=D+V;I<G;I+=3)u(e.getX(I+0),e.getX(I+1),e.getX(I+2))}const v=new O,M=new O,A=new O,b=new O;function T(N){A.fromBufferAttribute(r,N),b.copy(A);const w=a[N];v.copy(w),v.sub(A.multiplyScalar(A.dot(w))).normalize(),M.crossVectors(b,w);const D=M.dot(l[N])<0?-1:1;o.setXYZW(N,v.x,v.y,v.z,D)}for(let N=0,w=_.length;N<w;++N){const S=_[N],D=S.start,V=S.count;for(let I=D,G=D+V;I<G;I+=3)T(e.getX(I+0)),T(e.getX(I+1)),T(e.getX(I+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Bt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let h=0,p=i.count;h<p;h++)i.setXYZ(h,0,0,0);const r=new O,s=new O,o=new O,a=new O,l=new O,c=new O,d=new O,f=new O;if(e)for(let h=0,p=e.count;h<p;h+=3){const g=e.getX(h+0),y=e.getX(h+1),m=e.getX(h+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,y),o.fromBufferAttribute(t,m),d.subVectors(o,s),f.subVectors(r,s),d.cross(f),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,m),a.add(d),l.add(d),c.add(d),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,p=t.count;h<p;h+=3)r.fromBufferAttribute(t,h+0),s.fromBufferAttribute(t,h+1),o.fromBufferAttribute(t,h+2),d.subVectors(o,s),f.subVectors(r,s),d.cross(f),i.setXYZ(h+0,d.x,d.y,d.z),i.setXYZ(h+1,d.x,d.y,d.z),i.setXYZ(h+2,d.x,d.y,d.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)It.fromBufferAttribute(e,t),It.normalize(),e.setXYZ(t,It.x,It.y,It.z)}toNonIndexed(){function e(a,l){const c=a.array,d=a.itemSize,f=a.normalized,h=new c.constructor(l.length*d);let p=0,g=0;for(let y=0,m=l.length;y<m;y++){a.isInterleavedBufferAttribute?p=l[y]*a.data.stride+a.offset:p=l[y]*d;for(let u=0;u<d;u++)h[g++]=c[p++]}return new Bt(h,d,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new ni,i=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,i);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let d=0,f=c.length;d<f;d++){const h=c[d],p=e(h,i);l.push(p)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],d=[];for(let f=0,h=c.length;f<h;f++){const p=c[f];d.push(p.toJSON(e.data))}d.length>0&&(r[l]=d,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const c in r){const d=r[c];this.setAttribute(c,d.clone(t))}const s=e.morphAttributes;for(const c in s){const d=[],f=s[c];for(let h=0,p=f.length;h<p;h++)d.push(f[h].clone(t));this.morphAttributes[c]=d}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,d=o.length;c<d;c++){const f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Am=new Qe,Er=new th,qa=new eh,bm=new O,os=new O,as=new O,ls=new O,bu=new O,Ka=new O,Za=new Me,Ja=new Me,Qa=new Me,Cm=new O,Rm=new O,Pm=new O,el=new O,tl=new O;class At extends Ot{constructor(e=new ni,t=new bc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){Ka.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const d=a[l],f=s[l];d!==0&&(bu.fromBufferAttribute(f,e),o?Ka.addScaledVector(bu,d):Ka.addScaledVector(bu.sub(t),d))}t.add(Ka)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),qa.copy(i.boundingSphere),qa.applyMatrix4(s),Er.copy(e.ray).recast(e.near),!(qa.containsPoint(Er.origin)===!1&&(Er.intersectSphere(qa,bm)===null||Er.origin.distanceToSquared(bm)>(e.far-e.near)**2))&&(Am.copy(s).invert(),Er.copy(e.ray).applyMatrix4(Am),!(i.boundingBox!==null&&Er.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Er)))}_computeIntersections(e,t,i){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,d=s.attributes.uv1,f=s.attributes.normal,h=s.groups,p=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,y=h.length;g<y;g++){const m=h[g],u=o[m.materialIndex],_=Math.max(m.start,p.start),v=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let M=_,A=v;M<A;M+=3){const b=a.getX(M),T=a.getX(M+1),N=a.getX(M+2);r=nl(this,u,e,i,c,d,f,b,T,N),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),y=Math.min(a.count,p.start+p.count);for(let m=g,u=y;m<u;m+=3){const _=a.getX(m),v=a.getX(m+1),M=a.getX(m+2);r=nl(this,o,e,i,c,d,f,_,v,M),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,y=h.length;g<y;g++){const m=h[g],u=o[m.materialIndex],_=Math.max(m.start,p.start),v=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let M=_,A=v;M<A;M+=3){const b=M,T=M+1,N=M+2;r=nl(this,u,e,i,c,d,f,b,T,N),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),y=Math.min(l.count,p.start+p.count);for(let m=g,u=y;m<u;m+=3){const _=m,v=m+1,M=m+2;r=nl(this,o,e,i,c,d,f,_,v,M),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function GE(n,e,t,i,r,s,o,a){let l;if(e.side===hn?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,e.side===hr,a),l===null)return null;tl.copy(a),tl.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(tl);return c<t.near||c>t.far?null:{distance:c,point:tl.clone(),object:n}}function nl(n,e,t,i,r,s,o,a,l,c){n.getVertexPosition(a,os),n.getVertexPosition(l,as),n.getVertexPosition(c,ls);const d=GE(n,e,t,i,os,as,ls,el);if(d){r&&(Za.fromBufferAttribute(r,a),Ja.fromBufferAttribute(r,l),Qa.fromBufferAttribute(r,c),d.uv=ai.getInterpolation(el,os,as,ls,Za,Ja,Qa,new Me)),s&&(Za.fromBufferAttribute(s,a),Ja.fromBufferAttribute(s,l),Qa.fromBufferAttribute(s,c),d.uv1=ai.getInterpolation(el,os,as,ls,Za,Ja,Qa,new Me)),o&&(Cm.fromBufferAttribute(o,a),Rm.fromBufferAttribute(o,l),Pm.fromBufferAttribute(o,c),d.normal=ai.getInterpolation(el,os,as,ls,Cm,Rm,Pm,new O),d.normal.dot(i.direction)>0&&d.normal.multiplyScalar(-1));const f={a,b:l,c,normal:new O,materialIndex:0};ai.getNormal(os,as,ls,f.normal),d.face=f}return d}class Xr extends ni{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],d=[],f=[];let h=0,p=0;g("z","y","x",-1,-1,i,t,e,o,s,0),g("z","y","x",1,-1,i,t,-e,o,s,1),g("x","z","y",1,1,e,i,t,r,o,2),g("x","z","y",1,-1,e,i,-t,r,o,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new kt(c,3)),this.setAttribute("normal",new kt(d,3)),this.setAttribute("uv",new kt(f,2));function g(y,m,u,_,v,M,A,b,T,N,w){const S=M/T,D=A/N,V=M/2,I=A/2,G=b/2,B=T+1,J=N+1;let Z=0,P=0;const k=new O;for(let z=0;z<J;z++){const H=z*D-I;for(let X=0;X<B;X++){const ue=X*S-V;k[y]=ue*_,k[m]=H*v,k[u]=G,c.push(k.x,k.y,k.z),k[y]=0,k[m]=0,k[u]=b>0?1:-1,d.push(k.x,k.y,k.z),f.push(X/T),f.push(1-z/N),Z+=1}}for(let z=0;z<N;z++)for(let H=0;H<T;H++){const X=h+H+B*z,ue=h+H+B*(z+1),U=h+(H+1)+B*(z+1),ee=h+(H+1)+B*z;l.push(X,ue,ee),l.push(ue,U,ee),P+=6}a.addGroup(p,P,w),p+=P,h+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Xr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Js(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function nn(n){const e={};for(let t=0;t<n.length;t++){const i=Js(n[t]);for(const r in i)e[r]=i[r]}return e}function jE(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function P_(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:st.workingColorSpace}const fa={clone:Js,merge:nn};var WE=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,XE=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Vt extends ya{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=WE,this.fragmentShader=XE,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Js(e.uniforms),this.uniformsGroups=jE(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class N_ extends Ot{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Qe,this.projectionMatrix=new Qe,this.projectionMatrixInverse=new Qe,this.coordinateSystem=Ti}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Gi=new O,Nm=new Me,Lm=new Me;class xn extends N_{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=da*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(jo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return da*2*Math.atan(Math.tan(jo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Gi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Gi.x,Gi.y).multiplyScalar(-e/Gi.z),Gi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Gi.x,Gi.y).multiplyScalar(-e/Gi.z)}getViewSize(e,t){return this.getViewBounds(e,Nm,Lm),t.subVectors(Lm,Nm)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(jo*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,t-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const cs=-90,us=1;class $E extends Ot{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new xn(cs,us,e,t);r.layers=this.layers,this.add(r);const s=new xn(cs,us,e,t);s.layers=this.layers,this.add(s);const o=new xn(cs,us,e,t);o.layers=this.layers,this.add(o);const a=new xn(cs,us,e,t);a.layers=this.layers,this.add(a);const l=new xn(cs,us,e,t);l.layers=this.layers,this.add(l);const c=new xn(cs,us,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===Ti)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===nc)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,d]=this.children,f=e.getRenderTarget(),h=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,o),e.setRenderTarget(i,2,r),e.render(t,a),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=y,e.setRenderTarget(i,5,r),e.render(t,d),e.setRenderTarget(f,h,p),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class L_ extends Qt{constructor(e,t,i,r,s,o,a,l,c,d){e=e!==void 0?e:[],t=t!==void 0?t:Ys,super(e,t,i,r,s,o,a,l,c,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class YE extends ei{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new L_(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Fn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Xr(5,5,5),s=new Vt({name:"CubemapFromEquirect",uniforms:Js(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:hn,blending:bi});s.uniforms.tEquirect.value=t;const o=new At(r,s),a=t.minFilter;return t.minFilter===Ji&&(t.minFilter=Fn),new $E(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}}const Cu=new O,qE=new O,KE=new Be;class Xi{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Cu.subVectors(i,t).cross(qE.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Cu),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||KE.getNormalMatrix(e),r=this.coplanarPoint(Cu).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const wr=new eh,il=new O;class ih{constructor(e=new Xi,t=new Xi,i=new Xi,r=new Xi,s=new Xi,o=new Xi){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Ti){const i=this.planes,r=e.elements,s=r[0],o=r[1],a=r[2],l=r[3],c=r[4],d=r[5],f=r[6],h=r[7],p=r[8],g=r[9],y=r[10],m=r[11],u=r[12],_=r[13],v=r[14],M=r[15];if(i[0].setComponents(l-s,h-c,m-p,M-u).normalize(),i[1].setComponents(l+s,h+c,m+p,M+u).normalize(),i[2].setComponents(l+o,h+d,m+g,M+_).normalize(),i[3].setComponents(l-o,h-d,m-g,M-_).normalize(),i[4].setComponents(l-a,h-f,m-y,M-v).normalize(),t===Ti)i[5].setComponents(l+a,h+f,m+y,M+v).normalize();else if(t===nc)i[5].setComponents(a,f,y,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),wr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),wr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(wr)}intersectsSprite(e){return wr.center.set(0,0,0),wr.radius=.7071067811865476,wr.applyMatrix4(e.matrixWorld),this.intersectsSphere(wr)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(il.x=r.normal.x>0?e.max.x:e.min.x,il.y=r.normal.y>0?e.max.y:e.min.y,il.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(il)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function I_(){let n=null,e=!1,t=null,i=null;function r(s,o){t(s,o),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function ZE(n){const e=new WeakMap;function t(a,l){const c=a.array,d=a.usage,f=c.byteLength,h=n.createBuffer();n.bindBuffer(l,h),n.bufferData(l,c,d),a.onUploadCallback();let p;if(c instanceof Float32Array)p=n.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?p=n.HALF_FLOAT:p=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function i(a,l,c){const d=l.array,f=l._updateRange,h=l.updateRanges;if(n.bindBuffer(c,a),f.count===-1&&h.length===0&&n.bufferSubData(c,0,d),h.length!==0){for(let p=0,g=h.length;p<g;p++){const y=h[p];n.bufferSubData(c,y.start*d.BYTES_PER_ELEMENT,d,y.start,y.count)}l.clearUpdateRanges()}f.count!==-1&&(n.bufferSubData(c,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count),f.count=-1),l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(n.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isGLBufferAttribute){const d=e.get(a);(!d||d.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}class mr extends ni{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(i),l=Math.floor(r),c=a+1,d=l+1,f=e/a,h=t/l,p=[],g=[],y=[],m=[];for(let u=0;u<d;u++){const _=u*h-o;for(let v=0;v<c;v++){const M=v*f-s;g.push(M,-_,0),y.push(0,0,1),m.push(v/a),m.push(1-u/l)}}for(let u=0;u<l;u++)for(let _=0;_<a;_++){const v=_+c*u,M=_+c*(u+1),A=_+1+c*(u+1),b=_+1+c*u;p.push(v,M,b),p.push(M,A,b)}this.setIndex(p),this.setAttribute("position",new kt(g,3)),this.setAttribute("normal",new kt(y,3)),this.setAttribute("uv",new kt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new mr(e.width,e.height,e.widthSegments,e.heightSegments)}}var JE=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,QE=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ew=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,tw=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nw=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,iw=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,rw=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,sw=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ow=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,aw=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,lw=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,cw=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,uw=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,dw=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,fw=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,hw=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,pw=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,mw=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,gw=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,vw=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,_w=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,xw=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,yw=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Mw=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Sw=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Ew=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,ww=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Tw=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Aw=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,bw=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Cw="gl_FragColor = linearToOutputTexel( gl_FragColor );",Rw=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Pw=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Nw=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Lw=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Iw=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Dw=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Uw=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Fw=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ow=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,kw=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,zw=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Bw=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Vw=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Hw=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Gw=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,jw=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Ww=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Xw=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$w=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Yw=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,qw=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Kw=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Zw=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Jw=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Qw=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,eT=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,tT=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nT=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,iT=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,rT=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,sT=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,oT=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,aT=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lT=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,cT=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,uT=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[MORPHTARGETS_COUNT];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,dT=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,fT=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,hT=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
	#endif
	#ifdef MORPHTARGETS_TEXTURE
		#ifndef USE_INSTANCING_MORPH
			uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		#endif
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,pT=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,mT=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,gT=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,vT=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,_T=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xT=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,yT=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,MT=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ST=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ET=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,wT=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,TT=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,AT=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,bT=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,CT=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,RT=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,PT=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,NT=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,LT=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,IT=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return shadow;
	}
#endif`,DT=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,UT=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,FT=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,OT=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,kT=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,zT=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,BT=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,VT=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,HT=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,GT=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,jT=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,WT=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,XT=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,$T=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,YT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,qT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,KT=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ZT=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,JT=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,QT=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,e1=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,t1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,n1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,i1=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,r1=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,s1=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,o1=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,a1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,l1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,c1=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,u1=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,d1=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,f1=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,h1=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,p1=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,m1=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,g1=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,v1=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,_1=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,x1=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,y1=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,M1=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,S1=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,E1=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,w1=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,T1=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,A1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,b1=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,C1=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,R1=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,P1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,je={alphahash_fragment:JE,alphahash_pars_fragment:QE,alphamap_fragment:ew,alphamap_pars_fragment:tw,alphatest_fragment:nw,alphatest_pars_fragment:iw,aomap_fragment:rw,aomap_pars_fragment:sw,batching_pars_vertex:ow,batching_vertex:aw,begin_vertex:lw,beginnormal_vertex:cw,bsdfs:uw,iridescence_fragment:dw,bumpmap_pars_fragment:fw,clipping_planes_fragment:hw,clipping_planes_pars_fragment:pw,clipping_planes_pars_vertex:mw,clipping_planes_vertex:gw,color_fragment:vw,color_pars_fragment:_w,color_pars_vertex:xw,color_vertex:yw,common:Mw,cube_uv_reflection_fragment:Sw,defaultnormal_vertex:Ew,displacementmap_pars_vertex:ww,displacementmap_vertex:Tw,emissivemap_fragment:Aw,emissivemap_pars_fragment:bw,colorspace_fragment:Cw,colorspace_pars_fragment:Rw,envmap_fragment:Pw,envmap_common_pars_fragment:Nw,envmap_pars_fragment:Lw,envmap_pars_vertex:Iw,envmap_physical_pars_fragment:jw,envmap_vertex:Dw,fog_vertex:Uw,fog_pars_vertex:Fw,fog_fragment:Ow,fog_pars_fragment:kw,gradientmap_pars_fragment:zw,lightmap_pars_fragment:Bw,lights_lambert_fragment:Vw,lights_lambert_pars_fragment:Hw,lights_pars_begin:Gw,lights_toon_fragment:Ww,lights_toon_pars_fragment:Xw,lights_phong_fragment:$w,lights_phong_pars_fragment:Yw,lights_physical_fragment:qw,lights_physical_pars_fragment:Kw,lights_fragment_begin:Zw,lights_fragment_maps:Jw,lights_fragment_end:Qw,logdepthbuf_fragment:eT,logdepthbuf_pars_fragment:tT,logdepthbuf_pars_vertex:nT,logdepthbuf_vertex:iT,map_fragment:rT,map_pars_fragment:sT,map_particle_fragment:oT,map_particle_pars_fragment:aT,metalnessmap_fragment:lT,metalnessmap_pars_fragment:cT,morphinstance_vertex:uT,morphcolor_vertex:dT,morphnormal_vertex:fT,morphtarget_pars_vertex:hT,morphtarget_vertex:pT,normal_fragment_begin:mT,normal_fragment_maps:gT,normal_pars_fragment:vT,normal_pars_vertex:_T,normal_vertex:xT,normalmap_pars_fragment:yT,clearcoat_normal_fragment_begin:MT,clearcoat_normal_fragment_maps:ST,clearcoat_pars_fragment:ET,iridescence_pars_fragment:wT,opaque_fragment:TT,packing:AT,premultiplied_alpha_fragment:bT,project_vertex:CT,dithering_fragment:RT,dithering_pars_fragment:PT,roughnessmap_fragment:NT,roughnessmap_pars_fragment:LT,shadowmap_pars_fragment:IT,shadowmap_pars_vertex:DT,shadowmap_vertex:UT,shadowmask_pars_fragment:FT,skinbase_vertex:OT,skinning_pars_vertex:kT,skinning_vertex:zT,skinnormal_vertex:BT,specularmap_fragment:VT,specularmap_pars_fragment:HT,tonemapping_fragment:GT,tonemapping_pars_fragment:jT,transmission_fragment:WT,transmission_pars_fragment:XT,uv_pars_fragment:$T,uv_pars_vertex:YT,uv_vertex:qT,worldpos_vertex:KT,background_vert:ZT,background_frag:JT,backgroundCube_vert:QT,backgroundCube_frag:e1,cube_vert:t1,cube_frag:n1,depth_vert:i1,depth_frag:r1,distanceRGBA_vert:s1,distanceRGBA_frag:o1,equirect_vert:a1,equirect_frag:l1,linedashed_vert:c1,linedashed_frag:u1,meshbasic_vert:d1,meshbasic_frag:f1,meshlambert_vert:h1,meshlambert_frag:p1,meshmatcap_vert:m1,meshmatcap_frag:g1,meshnormal_vert:v1,meshnormal_frag:_1,meshphong_vert:x1,meshphong_frag:y1,meshphysical_vert:M1,meshphysical_frag:S1,meshtoon_vert:E1,meshtoon_frag:w1,points_vert:T1,points_frag:A1,shadow_vert:b1,shadow_frag:C1,sprite_vert:R1,sprite_frag:P1},he={common:{diffuse:{value:new Ve(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new Me(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ve(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ve(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new Ve(16777215)},opacity:{value:1},center:{value:new Me(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},si={basic:{uniforms:nn([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.fog]),vertexShader:je.meshbasic_vert,fragmentShader:je.meshbasic_frag},lambert:{uniforms:nn([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.fog,he.lights,{emissive:{value:new Ve(0)}}]),vertexShader:je.meshlambert_vert,fragmentShader:je.meshlambert_frag},phong:{uniforms:nn([he.common,he.specularmap,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.fog,he.lights,{emissive:{value:new Ve(0)},specular:{value:new Ve(1118481)},shininess:{value:30}}]),vertexShader:je.meshphong_vert,fragmentShader:je.meshphong_frag},standard:{uniforms:nn([he.common,he.envmap,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.roughnessmap,he.metalnessmap,he.fog,he.lights,{emissive:{value:new Ve(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag},toon:{uniforms:nn([he.common,he.aomap,he.lightmap,he.emissivemap,he.bumpmap,he.normalmap,he.displacementmap,he.gradientmap,he.fog,he.lights,{emissive:{value:new Ve(0)}}]),vertexShader:je.meshtoon_vert,fragmentShader:je.meshtoon_frag},matcap:{uniforms:nn([he.common,he.bumpmap,he.normalmap,he.displacementmap,he.fog,{matcap:{value:null}}]),vertexShader:je.meshmatcap_vert,fragmentShader:je.meshmatcap_frag},points:{uniforms:nn([he.points,he.fog]),vertexShader:je.points_vert,fragmentShader:je.points_frag},dashed:{uniforms:nn([he.common,he.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:je.linedashed_vert,fragmentShader:je.linedashed_frag},depth:{uniforms:nn([he.common,he.displacementmap]),vertexShader:je.depth_vert,fragmentShader:je.depth_frag},normal:{uniforms:nn([he.common,he.bumpmap,he.normalmap,he.displacementmap,{opacity:{value:1}}]),vertexShader:je.meshnormal_vert,fragmentShader:je.meshnormal_frag},sprite:{uniforms:nn([he.sprite,he.fog]),vertexShader:je.sprite_vert,fragmentShader:je.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:je.background_vert,fragmentShader:je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:je.backgroundCube_vert,fragmentShader:je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:je.cube_vert,fragmentShader:je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:je.equirect_vert,fragmentShader:je.equirect_frag},distanceRGBA:{uniforms:nn([he.common,he.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:je.distanceRGBA_vert,fragmentShader:je.distanceRGBA_frag},shadow:{uniforms:nn([he.lights,he.fog,{color:{value:new Ve(0)},opacity:{value:1}}]),vertexShader:je.shadow_vert,fragmentShader:je.shadow_frag}};si.physical={uniforms:nn([si.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new Me(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new Ve(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new Me},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new Ve(0)},specularColor:{value:new Ve(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new Me},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag};const rl={r:0,b:0,g:0},Tr=new ui,N1=new Qe;function L1(n,e,t,i,r,s,o){const a=new Ve(0);let l=s===!0?0:1,c,d,f=null,h=0,p=null;function g(_){let v=_.isScene===!0?_.background:null;return v&&v.isTexture&&(v=(_.backgroundBlurriness>0?t:e).get(v)),v}function y(_){let v=!1;const M=g(_);M===null?u(a,l):M&&M.isColor&&(u(M,1),v=!0);const A=n.xr.getEnvironmentBlendMode();A==="additive"?i.buffers.color.setClear(0,0,0,1,o):A==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||v)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil)}function m(_,v){const M=g(v);M&&(M.isCubeTexture||M.mapping===Tc)?(d===void 0&&(d=new At(new Xr(1,1,1),new Vt({name:"BackgroundCubeMaterial",uniforms:Js(si.backgroundCube.uniforms),vertexShader:si.backgroundCube.vertexShader,fragmentShader:si.backgroundCube.fragmentShader,side:hn,depthTest:!1,depthWrite:!1,fog:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(A,b,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(d)),Tr.copy(v.backgroundRotation),Tr.x*=-1,Tr.y*=-1,Tr.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Tr.y*=-1,Tr.z*=-1),d.material.uniforms.envMap.value=M,d.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,d.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(N1.makeRotationFromEuler(Tr)),d.material.toneMapped=st.getTransfer(M.colorSpace)!==lt,(f!==M||h!==M.version||p!==n.toneMapping)&&(d.material.needsUpdate=!0,f=M,h=M.version,p=n.toneMapping),d.layers.enableAll(),_.unshift(d,d.geometry,d.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new At(new mr(2,2),new Vt({name:"BackgroundMaterial",uniforms:Js(si.background.uniforms),vertexShader:si.background.vertexShader,fragmentShader:si.background.fragmentShader,side:hr,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=st.getTransfer(M.colorSpace)!==lt,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(f!==M||h!==M.version||p!==n.toneMapping)&&(c.material.needsUpdate=!0,f=M,h=M.version,p=n.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function u(_,v){_.getRGB(rl,P_(n)),i.buffers.color.setClear(rl.r,rl.g,rl.b,v,o)}return{getClearColor:function(){return a},setClearColor:function(_,v=1){a.set(_),l=v,u(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,u(a,l)},render:y,addToRenderList:m}}function I1(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=h(null);let s=r,o=!1;function a(S,D,V,I,G){let B=!1;const J=f(I,V,D);s!==J&&(s=J,c(s.object)),B=p(S,I,V,G),B&&g(S,I,V,G),G!==null&&e.update(G,n.ELEMENT_ARRAY_BUFFER),(B||o)&&(o=!1,M(S,D,V,I),G!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(G).buffer))}function l(){return n.createVertexArray()}function c(S){return n.bindVertexArray(S)}function d(S){return n.deleteVertexArray(S)}function f(S,D,V){const I=V.wireframe===!0;let G=i[S.id];G===void 0&&(G={},i[S.id]=G);let B=G[D.id];B===void 0&&(B={},G[D.id]=B);let J=B[I];return J===void 0&&(J=h(l()),B[I]=J),J}function h(S){const D=[],V=[],I=[];for(let G=0;G<t;G++)D[G]=0,V[G]=0,I[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:V,attributeDivisors:I,object:S,attributes:{},index:null}}function p(S,D,V,I){const G=s.attributes,B=D.attributes;let J=0;const Z=V.getAttributes();for(const P in Z)if(Z[P].location>=0){const z=G[P];let H=B[P];if(H===void 0&&(P==="instanceMatrix"&&S.instanceMatrix&&(H=S.instanceMatrix),P==="instanceColor"&&S.instanceColor&&(H=S.instanceColor)),z===void 0||z.attribute!==H||H&&z.data!==H.data)return!0;J++}return s.attributesNum!==J||s.index!==I}function g(S,D,V,I){const G={},B=D.attributes;let J=0;const Z=V.getAttributes();for(const P in Z)if(Z[P].location>=0){let z=B[P];z===void 0&&(P==="instanceMatrix"&&S.instanceMatrix&&(z=S.instanceMatrix),P==="instanceColor"&&S.instanceColor&&(z=S.instanceColor));const H={};H.attribute=z,z&&z.data&&(H.data=z.data),G[P]=H,J++}s.attributes=G,s.attributesNum=J,s.index=I}function y(){const S=s.newAttributes;for(let D=0,V=S.length;D<V;D++)S[D]=0}function m(S){u(S,0)}function u(S,D){const V=s.newAttributes,I=s.enabledAttributes,G=s.attributeDivisors;V[S]=1,I[S]===0&&(n.enableVertexAttribArray(S),I[S]=1),G[S]!==D&&(n.vertexAttribDivisor(S,D),G[S]=D)}function _(){const S=s.newAttributes,D=s.enabledAttributes;for(let V=0,I=D.length;V<I;V++)D[V]!==S[V]&&(n.disableVertexAttribArray(V),D[V]=0)}function v(S,D,V,I,G,B,J){J===!0?n.vertexAttribIPointer(S,D,V,G,B):n.vertexAttribPointer(S,D,V,I,G,B)}function M(S,D,V,I){y();const G=I.attributes,B=V.getAttributes(),J=D.defaultAttributeValues;for(const Z in B){const P=B[Z];if(P.location>=0){let k=G[Z];if(k===void 0&&(Z==="instanceMatrix"&&S.instanceMatrix&&(k=S.instanceMatrix),Z==="instanceColor"&&S.instanceColor&&(k=S.instanceColor)),k!==void 0){const z=k.normalized,H=k.itemSize,X=e.get(k);if(X===void 0)continue;const ue=X.buffer,U=X.type,ee=X.bytesPerElement,ie=U===n.INT||U===n.UNSIGNED_INT||k.gpuType===v_;if(k.isInterleavedBufferAttribute){const re=k.data,Ne=re.stride,Ue=k.offset;if(re.isInstancedInterleavedBuffer){for(let F=0;F<P.locationSize;F++)u(P.location+F,re.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=re.meshPerAttribute*re.count)}else for(let F=0;F<P.locationSize;F++)m(P.location+F);n.bindBuffer(n.ARRAY_BUFFER,ue);for(let F=0;F<P.locationSize;F++)v(P.location+F,H/P.locationSize,U,z,Ne*ee,(Ue+H/P.locationSize*F)*ee,ie)}else{if(k.isInstancedBufferAttribute){for(let re=0;re<P.locationSize;re++)u(P.location+re,k.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=k.meshPerAttribute*k.count)}else for(let re=0;re<P.locationSize;re++)m(P.location+re);n.bindBuffer(n.ARRAY_BUFFER,ue);for(let re=0;re<P.locationSize;re++)v(P.location+re,H/P.locationSize,U,z,H*ee,H/P.locationSize*re*ee,ie)}}else if(J!==void 0){const z=J[Z];if(z!==void 0)switch(z.length){case 2:n.vertexAttrib2fv(P.location,z);break;case 3:n.vertexAttrib3fv(P.location,z);break;case 4:n.vertexAttrib4fv(P.location,z);break;default:n.vertexAttrib1fv(P.location,z)}}}}_()}function A(){N();for(const S in i){const D=i[S];for(const V in D){const I=D[V];for(const G in I)d(I[G].object),delete I[G];delete D[V]}delete i[S]}}function b(S){if(i[S.id]===void 0)return;const D=i[S.id];for(const V in D){const I=D[V];for(const G in I)d(I[G].object),delete I[G];delete D[V]}delete i[S.id]}function T(S){for(const D in i){const V=i[D];if(V[S.id]===void 0)continue;const I=V[S.id];for(const G in I)d(I[G].object),delete I[G];delete V[S.id]}}function N(){w(),o=!0,s!==r&&(s=r,c(s.object))}function w(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:N,resetDefaultState:w,dispose:A,releaseStatesOfGeometry:b,releaseStatesOfProgram:T,initAttributes:y,enableAttribute:m,disableUnusedAttributes:_}}function D1(n,e,t){let i;function r(c){i=c}function s(c,d){n.drawArrays(i,c,d),t.update(d,i,1)}function o(c,d,f){f!==0&&(n.drawArraysInstanced(i,c,d,f),t.update(d,i,f))}function a(c,d,f){if(f===0)return;const h=e.get("WEBGL_multi_draw");if(h===null)for(let p=0;p<f;p++)this.render(c[p],d[p]);else{h.multiDrawArraysWEBGL(i,c,0,d,0,f);let p=0;for(let g=0;g<f;g++)p+=d[g];t.update(p,i,1)}}function l(c,d,f,h){if(f===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)o(c[g],d[g],h[g]);else{p.multiDrawArraysInstancedWEBGL(i,c,0,d,0,h,0,f);let g=0;for(let y=0;y<f;y++)g+=d[y];for(let y=0;y<h.length;y++)t.update(g,i,h[y])}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function U1(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const b=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(b.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(b){return!(b!==Zn&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(b){const T=b===ur&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(b!==pr&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&b!==Qi&&!T)}function l(b){if(b==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";b="mediump"}return b==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const d=l(c);d!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",d,"instead."),c=d);const f=t.logarithmicDepthBuffer===!0,h=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),p=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),y=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),u=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),_=n.getParameter(n.MAX_VARYING_VECTORS),v=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),M=p>0,A=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,maxTextures:h,maxVertexTextures:p,maxTextureSize:g,maxCubemapSize:y,maxAttributes:m,maxVertexUniforms:u,maxVaryings:_,maxFragmentUniforms:v,vertexTextures:M,maxSamples:A}}function F1(n){const e=this;let t=null,i=0,r=!1,s=!1;const o=new Xi,a=new Be,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,h){const p=f.length!==0||h||i!==0||r;return r=h,i=f.length,p},this.beginShadows=function(){s=!0,d(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(f,h){t=d(f,h,0)},this.setState=function(f,h,p){const g=f.clippingPlanes,y=f.clipIntersection,m=f.clipShadows,u=n.get(f);if(!r||g===null||g.length===0||s&&!m)s?d(null):c();else{const _=s?0:i,v=_*4;let M=u.clippingState||null;l.value=M,M=d(g,h,v,p);for(let A=0;A!==v;++A)M[A]=t[A];u.clippingState=M,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function d(f,h,p,g){const y=f!==null?f.length:0;let m=null;if(y!==0){if(m=l.value,g!==!0||m===null){const u=p+y*4,_=h.matrixWorldInverse;a.getNormalMatrix(_),(m===null||m.length<u)&&(m=new Float32Array(u));for(let v=0,M=p;v!==y;++v,M+=4)o.copy(f[v]).applyMatrix4(_,a),o.normal.toArray(m,M),m[M+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,m}}function O1(n){let e=new WeakMap;function t(o,a){return a===qd?o.mapping=Ys:a===Kd&&(o.mapping=qs),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===qd||a===Kd)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new YE(l.height);return c.fromEquirectangularTexture(n,o),e.set(o,c),o.addEventListener("dispose",r),t(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class rh extends N_{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=d*this.view.offsetY,l=a-d*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const Cs=4,Im=[.125,.215,.35,.446,.526,.582],Lr=20,Ru=new rh,Dm=new Ve;let Pu=null,Nu=0,Lu=0,Iu=!1;const Pr=(1+Math.sqrt(5))/2,ds=1/Pr,Um=[new O(-Pr,ds,0),new O(Pr,ds,0),new O(-ds,0,Pr),new O(ds,0,Pr),new O(0,Pr,-ds),new O(0,Pr,ds),new O(-1,1,-1),new O(1,1,-1),new O(-1,1,1),new O(1,1,1)];class Fm{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){Pu=this._renderer.getRenderTarget(),Nu=this._renderer.getActiveCubeFace(),Lu=this._renderer.getActiveMipmapLevel(),Iu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=zm(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=km(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Pu,Nu,Lu),this._renderer.xr.enabled=Iu,e.scissorTest=!1,sl(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ys||e.mapping===qs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Pu=this._renderer.getRenderTarget(),Nu=this._renderer.getActiveCubeFace(),Lu=this._renderer.getActiveMipmapLevel(),Iu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Fn,minFilter:Fn,generateMipmaps:!1,type:ur,format:Zn,colorSpace:xr,depthBuffer:!1},r=Om(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Om(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=k1(s)),this._blurMaterial=z1(s,e,t)}return r}_compileMaterial(e){const t=new At(this._lodPlanes[0],e);this._renderer.compile(t,Ru)}_sceneToCubeUV(e,t,i,r){const a=new xn(90,1,t,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],d=this._renderer,f=d.autoClear,h=d.toneMapping;d.getClearColor(Dm),d.toneMapping=cr,d.autoClear=!1;const p=new bc({name:"PMREM.Background",side:hn,depthWrite:!1,depthTest:!1}),g=new At(new Xr,p);let y=!1;const m=e.background;m?m.isColor&&(p.color.copy(m),e.background=null,y=!0):(p.color.copy(Dm),y=!0);for(let u=0;u<6;u++){const _=u%3;_===0?(a.up.set(0,l[u],0),a.lookAt(c[u],0,0)):_===1?(a.up.set(0,0,l[u]),a.lookAt(0,c[u],0)):(a.up.set(0,l[u],0),a.lookAt(0,0,c[u]));const v=this._cubeSize;sl(r,_*v,u>2?v:0,v,v),d.setRenderTarget(r),y&&d.render(g,a),d.render(e,a)}g.geometry.dispose(),g.material.dispose(),d.toneMapping=h,d.autoClear=f,e.background=m}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===Ys||e.mapping===qs;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=zm()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=km());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new At(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;sl(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,Ru)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=Um[(r-s-1)%Um.length];this._blur(e,s-1,s,o,a)}t.autoClear=i}_blur(e,t,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const d=3,f=new At(this._lodPlanes[r],c),h=c.uniforms,p=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*p):2*Math.PI/(2*Lr-1),y=s/g,m=isFinite(s)?1+Math.floor(d*y):Lr;m>Lr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Lr}`);const u=[];let _=0;for(let T=0;T<Lr;++T){const N=T/y,w=Math.exp(-N*N/2);u.push(w),T===0?_+=w:T<m&&(_+=2*w)}for(let T=0;T<u.length;T++)u[T]=u[T]/_;h.envMap.value=e.texture,h.samples.value=m,h.weights.value=u,h.latitudinal.value=o==="latitudinal",a&&(h.poleAxis.value=a);const{_lodMax:v}=this;h.dTheta.value=g,h.mipInt.value=v-i;const M=this._sizeLods[r],A=3*M*(r>v-Cs?r-v+Cs:0),b=4*(this._cubeSize-M);sl(t,A,b,3*M,2*M),l.setRenderTarget(t),l.render(f,Ru)}}function k1(n){const e=[],t=[],i=[];let r=n;const s=n-Cs+1+Im.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let l=1/a;o>n-Cs?l=Im[o-n+Cs-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),d=-c,f=1+c,h=[d,d,f,d,f,f,d,d,f,f,d,f],p=6,g=6,y=3,m=2,u=1,_=new Float32Array(y*g*p),v=new Float32Array(m*g*p),M=new Float32Array(u*g*p);for(let b=0;b<p;b++){const T=b%3*2/3-1,N=b>2?0:-1,w=[T,N,0,T+2/3,N,0,T+2/3,N+1,0,T,N,0,T+2/3,N+1,0,T,N+1,0];_.set(w,y*g*b),v.set(h,m*g*b);const S=[b,b,b,b,b,b];M.set(S,u*g*b)}const A=new ni;A.setAttribute("position",new Bt(_,y)),A.setAttribute("uv",new Bt(v,m)),A.setAttribute("faceIndex",new Bt(M,u)),e.push(A),r>Cs&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Om(n,e,t){const i=new ei(n,e,t);return i.texture.mapping=Tc,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function sl(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function z1(n,e,t){const i=new Float32Array(Lr),r=new O(0,1,0);return new Vt({name:"SphericalGaussianBlur",defines:{n:Lr,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:sh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:bi,depthTest:!1,depthWrite:!1})}function km(){return new Vt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:sh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:bi,depthTest:!1,depthWrite:!1})}function zm(){return new Vt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:sh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:bi,depthTest:!1,depthWrite:!1})}function sh(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function B1(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===qd||l===Kd,d=l===Ys||l===qs;if(c||d){let f=e.get(a);const h=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==h)return t===null&&(t=new Fm(n)),f=c?t.fromEquirectangular(a,f):t.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),f.texture;if(f!==void 0)return f.texture;{const p=a.image;return c&&p&&p.height>0||d&&p&&r(p)?(t===null&&(t=new Fm(n)),f=c?t.fromEquirectangular(a):t.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),a.addEventListener("dispose",s),f.texture):null}}}return a}function r(a){let l=0;const c=6;for(let d=0;d<c;d++)a[d]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function V1(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function H1(n,e,t,i){const r={},s=new WeakMap;function o(f){const h=f.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);for(const g in h.morphAttributes){const y=h.morphAttributes[g];for(let m=0,u=y.length;m<u;m++)e.remove(y[m])}h.removeEventListener("dispose",o),delete r[h.id];const p=s.get(h);p&&(e.remove(p),s.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function a(f,h){return r[h.id]===!0||(h.addEventListener("dispose",o),r[h.id]=!0,t.memory.geometries++),h}function l(f){const h=f.attributes;for(const g in h)e.update(h[g],n.ARRAY_BUFFER);const p=f.morphAttributes;for(const g in p){const y=p[g];for(let m=0,u=y.length;m<u;m++)e.update(y[m],n.ARRAY_BUFFER)}}function c(f){const h=[],p=f.index,g=f.attributes.position;let y=0;if(p!==null){const _=p.array;y=p.version;for(let v=0,M=_.length;v<M;v+=3){const A=_[v+0],b=_[v+1],T=_[v+2];h.push(A,b,b,T,T,A)}}else if(g!==void 0){const _=g.array;y=g.version;for(let v=0,M=_.length/3-1;v<M;v+=3){const A=v+0,b=v+1,T=v+2;h.push(A,b,b,T,T,A)}}else return;const m=new(T_(h)?R_:C_)(h,1);m.version=y;const u=s.get(f);u&&e.remove(u),s.set(f,m)}function d(f){const h=s.get(f);if(h){const p=f.index;p!==null&&h.version<p.version&&c(f)}else c(f);return s.get(f)}return{get:a,update:l,getWireframeAttribute:d}}function G1(n,e,t){let i;function r(h){i=h}let s,o;function a(h){s=h.type,o=h.bytesPerElement}function l(h,p){n.drawElements(i,p,s,h*o),t.update(p,i,1)}function c(h,p,g){g!==0&&(n.drawElementsInstanced(i,p,s,h*o,g),t.update(p,i,g))}function d(h,p,g){if(g===0)return;const y=e.get("WEBGL_multi_draw");if(y===null)for(let m=0;m<g;m++)this.render(h[m]/o,p[m]);else{y.multiDrawElementsWEBGL(i,p,0,s,h,0,g);let m=0;for(let u=0;u<g;u++)m+=p[u];t.update(m,i,1)}}function f(h,p,g,y){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let u=0;u<h.length;u++)c(h[u]/o,p[u],y[u]);else{m.multiDrawElementsInstancedWEBGL(i,p,0,s,h,0,y,0,g);let u=0;for(let _=0;_<g;_++)u+=p[_];for(let _=0;_<y.length;_++)t.update(u,i,y[_])}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d,this.renderMultiDrawInstances=f}function j1(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function W1(n,e,t){const i=new WeakMap,r=new Ut;function s(o,a,l){const c=o.morphTargetInfluences,d=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=d!==void 0?d.length:0;let h=i.get(a);if(h===void 0||h.count!==f){let S=function(){N.dispose(),i.delete(a),a.removeEventListener("dispose",S)};var p=S;h!==void 0&&h.texture.dispose();const g=a.morphAttributes.position!==void 0,y=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,u=a.morphAttributes.position||[],_=a.morphAttributes.normal||[],v=a.morphAttributes.color||[];let M=0;g===!0&&(M=1),y===!0&&(M=2),m===!0&&(M=3);let A=a.attributes.position.count*M,b=1;A>e.maxTextureSize&&(b=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);const T=new Float32Array(A*b*4*f),N=new A_(T,A,b,f);N.type=Qi,N.needsUpdate=!0;const w=M*4;for(let D=0;D<f;D++){const V=u[D],I=_[D],G=v[D],B=A*b*4*D;for(let J=0;J<V.count;J++){const Z=J*w;g===!0&&(r.fromBufferAttribute(V,J),T[B+Z+0]=r.x,T[B+Z+1]=r.y,T[B+Z+2]=r.z,T[B+Z+3]=0),y===!0&&(r.fromBufferAttribute(I,J),T[B+Z+4]=r.x,T[B+Z+5]=r.y,T[B+Z+6]=r.z,T[B+Z+7]=0),m===!0&&(r.fromBufferAttribute(G,J),T[B+Z+8]=r.x,T[B+Z+9]=r.y,T[B+Z+10]=r.z,T[B+Z+11]=G.itemSize===4?r.w:1)}}h={count:f,texture:N,size:new Me(A,b)},i.set(a,h),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const y=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(n,"morphTargetBaseInfluence",y),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",h.size)}return{update:s}}function X1(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,d=l.geometry,f=e.get(l,d);if(r.get(f)!==c&&(e.update(f),r.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const h=l.skeleton;r.get(h)!==c&&(h.update(),r.set(h,c))}return f}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}class D_ extends Qt{constructor(e,t,i,r,s,o,a,l,c,d){if(d=d!==void 0?d:Os,d!==Os&&d!==ua)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&d===Os&&(i=Ks),i===void 0&&d===ua&&(i=xa),super(null,r,s,o,a,l,d,i,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=a!==void 0?a:Sn,this.minFilter=l!==void 0?l:Sn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const U_=new Qt,F_=new D_(1,1);F_.compareFunction=w_;const O_=new A_,k_=new IE,z_=new L_,Bm=[],Vm=[],Hm=new Float32Array(16),Gm=new Float32Array(9),jm=new Float32Array(4);function so(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=Bm[r];if(s===void 0&&(s=new Float32Array(r),Bm[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function Pt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Nt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Cc(n,e){let t=Vm[e];t===void 0&&(t=new Int32Array(e),Vm[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function $1(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Y1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2fv(this.addr,e),Nt(t,e)}}function q1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;n.uniform3fv(this.addr,e),Nt(t,e)}}function K1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4fv(this.addr,e),Nt(t,e)}}function Z1(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;jm.set(i),n.uniformMatrix2fv(this.addr,!1,jm),Nt(t,i)}}function J1(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Gm.set(i),n.uniformMatrix3fv(this.addr,!1,Gm),Nt(t,i)}}function Q1(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Hm.set(i),n.uniformMatrix4fv(this.addr,!1,Hm),Nt(t,i)}}function eA(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function tA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2iv(this.addr,e),Nt(t,e)}}function nA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3iv(this.addr,e),Nt(t,e)}}function iA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4iv(this.addr,e),Nt(t,e)}}function rA(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function sA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2uiv(this.addr,e),Nt(t,e)}}function oA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3uiv(this.addr,e),Nt(t,e)}}function aA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4uiv(this.addr,e),Nt(t,e)}}function lA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);const s=this.type===n.SAMPLER_2D_SHADOW?F_:U_;t.setTexture2D(e||s,r)}function cA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||k_,r)}function uA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||z_,r)}function dA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||O_,r)}function fA(n){switch(n){case 5126:return $1;case 35664:return Y1;case 35665:return q1;case 35666:return K1;case 35674:return Z1;case 35675:return J1;case 35676:return Q1;case 5124:case 35670:return eA;case 35667:case 35671:return tA;case 35668:case 35672:return nA;case 35669:case 35673:return iA;case 5125:return rA;case 36294:return sA;case 36295:return oA;case 36296:return aA;case 35678:case 36198:case 36298:case 36306:case 35682:return lA;case 35679:case 36299:case 36307:return cA;case 35680:case 36300:case 36308:case 36293:return uA;case 36289:case 36303:case 36311:case 36292:return dA}}function hA(n,e){n.uniform1fv(this.addr,e)}function pA(n,e){const t=so(e,this.size,2);n.uniform2fv(this.addr,t)}function mA(n,e){const t=so(e,this.size,3);n.uniform3fv(this.addr,t)}function gA(n,e){const t=so(e,this.size,4);n.uniform4fv(this.addr,t)}function vA(n,e){const t=so(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function _A(n,e){const t=so(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function xA(n,e){const t=so(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function yA(n,e){n.uniform1iv(this.addr,e)}function MA(n,e){n.uniform2iv(this.addr,e)}function SA(n,e){n.uniform3iv(this.addr,e)}function EA(n,e){n.uniform4iv(this.addr,e)}function wA(n,e){n.uniform1uiv(this.addr,e)}function TA(n,e){n.uniform2uiv(this.addr,e)}function AA(n,e){n.uniform3uiv(this.addr,e)}function bA(n,e){n.uniform4uiv(this.addr,e)}function CA(n,e,t){const i=this.cache,r=e.length,s=Cc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||U_,s[o])}function RA(n,e,t){const i=this.cache,r=e.length,s=Cc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||k_,s[o])}function PA(n,e,t){const i=this.cache,r=e.length,s=Cc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||z_,s[o])}function NA(n,e,t){const i=this.cache,r=e.length,s=Cc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||O_,s[o])}function LA(n){switch(n){case 5126:return hA;case 35664:return pA;case 35665:return mA;case 35666:return gA;case 35674:return vA;case 35675:return _A;case 35676:return xA;case 5124:case 35670:return yA;case 35667:case 35671:return MA;case 35668:case 35672:return SA;case 35669:case 35673:return EA;case 5125:return wA;case 36294:return TA;case 36295:return AA;case 36296:return bA;case 35678:case 36198:case 36298:case 36306:case 35682:return CA;case 35679:case 36299:case 36307:return RA;case 35680:case 36300:case 36308:case 36293:return PA;case 36289:case 36303:case 36311:case 36292:return NA}}class IA{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=fA(t.type)}}class DA{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=LA(t.type)}}class UA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],i)}}}const Du=/(\w+)(\])?(\[|\.)?/g;function Wm(n,e){n.seq.push(e),n.map[e.id]=e}function FA(n,e,t){const i=n.name,r=i.length;for(Du.lastIndex=0;;){const s=Du.exec(i),o=Du.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){Wm(t,c===void 0?new IA(a,n,e):new DA(a,n,e));break}else{let f=t.map[a];f===void 0&&(f=new UA(a),Wm(t,f)),t=f}}}class El{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);FA(s,o,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&i.push(o)}return i}}function Xm(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const OA=37297;let kA=0;function zA(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}function BA(n){const e=st.getPrimaries(st.workingColorSpace),t=st.getPrimaries(n);let i;switch(e===t?i="":e===tc&&t===ec?i="LinearDisplayP3ToLinearSRGB":e===ec&&t===tc&&(i="LinearSRGBToLinearDisplayP3"),n){case xr:case Ac:return[i,"LinearTransferOETF"];case _n:case Zf:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function $m(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+zA(n.getShaderSource(e),o)}else return r}function VA(n,e){const t=BA(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function HA(n,e){let t;switch(e){case c_:t="Linear";break;case u_:t="Reinhard";break;case d_:t="OptimizedCineon";break;case Kf:t="ACESFilmic";break;case f_:t="AgX";break;case h_:t="Neutral";break;case VS:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function GA(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Lo).join(`
`)}function jA(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function WA(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function Lo(n){return n!==""}function Ym(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function qm(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const XA=/^[ \t]*#include +<([\w\d./]+)>/gm;function Zd(n){return n.replace(XA,YA)}const $A=new Map;function YA(n,e){let t=je[e];if(t===void 0){const i=$A.get(e);if(i!==void 0)t=je[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Zd(t)}const qA=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Km(n){return n.replace(qA,KA)}function KA(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Zm(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function ZA(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===o_?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===a_?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===xi&&(e="SHADOWMAP_TYPE_VSM"),e}function JA(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Ys:case qs:e="ENVMAP_TYPE_CUBE";break;case Tc:e="ENVMAP_TYPE_CUBE_UV";break}return e}function QA(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case qs:e="ENVMAP_MODE_REFRACTION";break}return e}function eb(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case l_:e="ENVMAP_BLENDING_MULTIPLY";break;case zS:e="ENVMAP_BLENDING_MIX";break;case BS:e="ENVMAP_BLENDING_ADD";break}return e}function tb(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function nb(n,e,t,i){const r=n.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=ZA(t),c=JA(t),d=QA(t),f=eb(t),h=tb(t),p=GA(t),g=jA(s),y=r.createProgram();let m,u,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Lo).join(`
`),m.length>0&&(m+=`
`),u=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Lo).join(`
`),u.length>0&&(u+=`
`)):(m=[Zm(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Lo).join(`
`),u=[Zm(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+d:"",t.envMap?"#define "+f:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==cr?"#define TONE_MAPPING":"",t.toneMapping!==cr?je.tonemapping_pars_fragment:"",t.toneMapping!==cr?HA("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",je.colorspace_pars_fragment,VA("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Lo).join(`
`)),o=Zd(o),o=Ym(o,t),o=qm(o,t),a=Zd(a),a=Ym(a,t),a=qm(a,t),o=Km(o),a=Km(a),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,u=["#define varying in",t.glslVersion===fm?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===fm?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);const v=_+m+o,M=_+u+a,A=Xm(r,r.VERTEX_SHADER,v),b=Xm(r,r.FRAGMENT_SHADER,M);r.attachShader(y,A),r.attachShader(y,b),t.index0AttributeName!==void 0?r.bindAttribLocation(y,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(y,0,"position"),r.linkProgram(y);function T(D){if(n.debug.checkShaderErrors){const V=r.getProgramInfoLog(y).trim(),I=r.getShaderInfoLog(A).trim(),G=r.getShaderInfoLog(b).trim();let B=!0,J=!0;if(r.getProgramParameter(y,r.LINK_STATUS)===!1)if(B=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,y,A,b);else{const Z=$m(r,A,"vertex"),P=$m(r,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(y,r.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+V+`
`+Z+`
`+P)}else V!==""?console.warn("THREE.WebGLProgram: Program Info Log:",V):(I===""||G==="")&&(J=!1);J&&(D.diagnostics={runnable:B,programLog:V,vertexShader:{log:I,prefix:m},fragmentShader:{log:G,prefix:u}})}r.deleteShader(A),r.deleteShader(b),N=new El(r,y),w=WA(r,y)}let N;this.getUniforms=function(){return N===void 0&&T(this),N};let w;this.getAttributes=function(){return w===void 0&&T(this),w};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(y,OA)),S},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=kA++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=A,this.fragmentShader=b,this}let ib=0;class rb{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new sb(e),t.set(e,i)),i}}class sb{constructor(e){this.id=ib++,this.code=e,this.usedTimes=0}}function ob(n,e,t,i,r,s,o){const a=new nh,l=new rb,c=new Set,d=[],f=r.logarithmicDepthBuffer,h=r.vertexTextures;let p=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(w){return c.add(w),w===0?"uv":`uv${w}`}function m(w,S,D,V,I){const G=V.fog,B=I.geometry,J=w.isMeshStandardMaterial?V.environment:null,Z=(w.isMeshStandardMaterial?t:e).get(w.envMap||J),P=Z&&Z.mapping===Tc?Z.image.height:null,k=g[w.type];w.precision!==null&&(p=r.getMaxPrecision(w.precision),p!==w.precision&&console.warn("THREE.WebGLProgram.getParameters:",w.precision,"not supported, using",p,"instead."));const z=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,H=z!==void 0?z.length:0;let X=0;B.morphAttributes.position!==void 0&&(X=1),B.morphAttributes.normal!==void 0&&(X=2),B.morphAttributes.color!==void 0&&(X=3);let ue,U,ee,ie;if(k){const et=si[k];ue=et.vertexShader,U=et.fragmentShader}else ue=w.vertexShader,U=w.fragmentShader,l.update(w),ee=l.getVertexShaderID(w),ie=l.getFragmentShaderID(w);const re=n.getRenderTarget(),Ne=I.isInstancedMesh===!0,Ue=I.isBatchedMesh===!0,F=!!w.map,ye=!!w.matcap,ce=!!Z,We=!!w.aoMap,ve=!!w.lightMap,be=!!w.bumpMap,Re=!!w.normalMap,Ie=!!w.displacementMap,rt=!!w.emissiveMap,L=!!w.metalnessMap,C=!!w.roughnessMap,$=w.anisotropy>0,ne=w.clearcoat>0,oe=w.dispersion>0,ae=w.iridescence>0,Ae=w.sheen>0,me=w.transmission>0,pe=$&&!!w.anisotropyMap,De=ne&&!!w.clearcoatMap,fe=ne&&!!w.clearcoatNormalMap,Te=ne&&!!w.clearcoatRoughnessMap,Ze=ae&&!!w.iridescenceMap,Ce=ae&&!!w.iridescenceThicknessMap,xe=Ae&&!!w.sheenColorMap,ke=Ae&&!!w.sheenRoughnessMap,Xe=!!w.specularMap,at=!!w.specularColorMap,He=!!w.specularIntensityMap,E=me&&!!w.transmissionMap,j=me&&!!w.thicknessMap,Y=!!w.gradientMap,se=!!w.alphaMap,de=w.alphaTest>0,ze=!!w.alphaHash,$e=!!w.extensions;let mt=cr;w.toneMapped&&(re===null||re.isXRRenderTarget===!0)&&(mt=n.toneMapping);const Lt={shaderID:k,shaderType:w.type,shaderName:w.name,vertexShader:ue,fragmentShader:U,defines:w.defines,customVertexShaderID:ee,customFragmentShaderID:ie,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:p,batching:Ue,instancing:Ne,instancingColor:Ne&&I.instanceColor!==null,instancingMorph:Ne&&I.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:re===null?n.outputColorSpace:re.isXRRenderTarget===!0?re.texture.colorSpace:xr,alphaToCoverage:!!w.alphaToCoverage,map:F,matcap:ye,envMap:ce,envMapMode:ce&&Z.mapping,envMapCubeUVHeight:P,aoMap:We,lightMap:ve,bumpMap:be,normalMap:Re,displacementMap:h&&Ie,emissiveMap:rt,normalMapObjectSpace:Re&&w.normalMapType===nE,normalMapTangentSpace:Re&&w.normalMapType===E_,metalnessMap:L,roughnessMap:C,anisotropy:$,anisotropyMap:pe,clearcoat:ne,clearcoatMap:De,clearcoatNormalMap:fe,clearcoatRoughnessMap:Te,dispersion:oe,iridescence:ae,iridescenceMap:Ze,iridescenceThicknessMap:Ce,sheen:Ae,sheenColorMap:xe,sheenRoughnessMap:ke,specularMap:Xe,specularColorMap:at,specularIntensityMap:He,transmission:me,transmissionMap:E,thicknessMap:j,gradientMap:Y,opaque:w.transparent===!1&&w.blending===Fs&&w.alphaToCoverage===!1,alphaMap:se,alphaTest:de,alphaHash:ze,combine:w.combine,mapUv:F&&y(w.map.channel),aoMapUv:We&&y(w.aoMap.channel),lightMapUv:ve&&y(w.lightMap.channel),bumpMapUv:be&&y(w.bumpMap.channel),normalMapUv:Re&&y(w.normalMap.channel),displacementMapUv:Ie&&y(w.displacementMap.channel),emissiveMapUv:rt&&y(w.emissiveMap.channel),metalnessMapUv:L&&y(w.metalnessMap.channel),roughnessMapUv:C&&y(w.roughnessMap.channel),anisotropyMapUv:pe&&y(w.anisotropyMap.channel),clearcoatMapUv:De&&y(w.clearcoatMap.channel),clearcoatNormalMapUv:fe&&y(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Te&&y(w.clearcoatRoughnessMap.channel),iridescenceMapUv:Ze&&y(w.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&y(w.iridescenceThicknessMap.channel),sheenColorMapUv:xe&&y(w.sheenColorMap.channel),sheenRoughnessMapUv:ke&&y(w.sheenRoughnessMap.channel),specularMapUv:Xe&&y(w.specularMap.channel),specularColorMapUv:at&&y(w.specularColorMap.channel),specularIntensityMapUv:He&&y(w.specularIntensityMap.channel),transmissionMapUv:E&&y(w.transmissionMap.channel),thicknessMapUv:j&&y(w.thicknessMap.channel),alphaMapUv:se&&y(w.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(Re||$),vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!B.attributes.uv&&(F||se),fog:!!G,useFog:w.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:w.flatShading===!0,sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:f,skinning:I.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:H,morphTextureStride:X,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:w.dithering,shadowMapEnabled:n.shadowMap.enabled&&D.length>0,shadowMapType:n.shadowMap.type,toneMapping:mt,useLegacyLights:n._useLegacyLights,decodeVideoTexture:F&&w.map.isVideoTexture===!0&&st.getTransfer(w.map.colorSpace)===lt,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===Un,flipSided:w.side===hn,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:$e&&w.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:$e&&w.extensions.multiDraw===!0&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Lt.vertexUv1s=c.has(1),Lt.vertexUv2s=c.has(2),Lt.vertexUv3s=c.has(3),c.clear(),Lt}function u(w){const S=[];if(w.shaderID?S.push(w.shaderID):(S.push(w.customVertexShaderID),S.push(w.customFragmentShaderID)),w.defines!==void 0)for(const D in w.defines)S.push(D),S.push(w.defines[D]);return w.isRawShaderMaterial===!1&&(_(S,w),v(S,w),S.push(n.outputColorSpace)),S.push(w.customProgramCacheKey),S.join()}function _(w,S){w.push(S.precision),w.push(S.outputColorSpace),w.push(S.envMapMode),w.push(S.envMapCubeUVHeight),w.push(S.mapUv),w.push(S.alphaMapUv),w.push(S.lightMapUv),w.push(S.aoMapUv),w.push(S.bumpMapUv),w.push(S.normalMapUv),w.push(S.displacementMapUv),w.push(S.emissiveMapUv),w.push(S.metalnessMapUv),w.push(S.roughnessMapUv),w.push(S.anisotropyMapUv),w.push(S.clearcoatMapUv),w.push(S.clearcoatNormalMapUv),w.push(S.clearcoatRoughnessMapUv),w.push(S.iridescenceMapUv),w.push(S.iridescenceThicknessMapUv),w.push(S.sheenColorMapUv),w.push(S.sheenRoughnessMapUv),w.push(S.specularMapUv),w.push(S.specularColorMapUv),w.push(S.specularIntensityMapUv),w.push(S.transmissionMapUv),w.push(S.thicknessMapUv),w.push(S.combine),w.push(S.fogExp2),w.push(S.sizeAttenuation),w.push(S.morphTargetsCount),w.push(S.morphAttributeCount),w.push(S.numDirLights),w.push(S.numPointLights),w.push(S.numSpotLights),w.push(S.numSpotLightMaps),w.push(S.numHemiLights),w.push(S.numRectAreaLights),w.push(S.numDirLightShadows),w.push(S.numPointLightShadows),w.push(S.numSpotLightShadows),w.push(S.numSpotLightShadowsWithMaps),w.push(S.numLightProbes),w.push(S.shadowMapType),w.push(S.toneMapping),w.push(S.numClippingPlanes),w.push(S.numClipIntersection),w.push(S.depthPacking)}function v(w,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),w.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.skinning&&a.enable(4),S.morphTargets&&a.enable(5),S.morphNormals&&a.enable(6),S.morphColors&&a.enable(7),S.premultipliedAlpha&&a.enable(8),S.shadowMapEnabled&&a.enable(9),S.useLegacyLights&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.alphaToCoverage&&a.enable(20),w.push(a.mask)}function M(w){const S=g[w.type];let D;if(S){const V=si[S];D=fa.clone(V.uniforms)}else D=w.uniforms;return D}function A(w,S){let D;for(let V=0,I=d.length;V<I;V++){const G=d[V];if(G.cacheKey===S){D=G,++D.usedTimes;break}}return D===void 0&&(D=new nb(n,S,w,s),d.push(D)),D}function b(w){if(--w.usedTimes===0){const S=d.indexOf(w);d[S]=d[d.length-1],d.pop(),w.destroy()}}function T(w){l.remove(w)}function N(){l.dispose()}return{getParameters:m,getProgramCacheKey:u,getUniforms:M,acquireProgram:A,releaseProgram:b,releaseShaderCache:T,programs:d,dispose:N}}function ab(){let n=new WeakMap;function e(s){let o=n.get(s);return o===void 0&&(o={},n.set(s,o)),o}function t(s){n.delete(s)}function i(s,o,a){n.get(s)[o]=a}function r(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function lb(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Jm(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Qm(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(f,h,p,g,y,m){let u=n[e];return u===void 0?(u={id:f.id,object:f,geometry:h,material:p,groupOrder:g,renderOrder:f.renderOrder,z:y,group:m},n[e]=u):(u.id=f.id,u.object=f,u.geometry=h,u.material=p,u.groupOrder=g,u.renderOrder=f.renderOrder,u.z=y,u.group=m),e++,u}function a(f,h,p,g,y,m){const u=o(f,h,p,g,y,m);p.transmission>0?i.push(u):p.transparent===!0?r.push(u):t.push(u)}function l(f,h,p,g,y,m){const u=o(f,h,p,g,y,m);p.transmission>0?i.unshift(u):p.transparent===!0?r.unshift(u):t.unshift(u)}function c(f,h){t.length>1&&t.sort(f||lb),i.length>1&&i.sort(h||Jm),r.length>1&&r.sort(h||Jm)}function d(){for(let f=e,h=n.length;f<h;f++){const p=n[f];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:d,sort:c}}function cb(){let n=new WeakMap;function e(i,r){const s=n.get(i);let o;return s===void 0?(o=new Qm,n.set(i,[o])):r>=s.length?(o=new Qm,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function ub(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new Ve};break;case"SpotLight":t={position:new O,direction:new O,color:new Ve,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Ve,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Ve,groundColor:new Ve};break;case"RectAreaLight":t={color:new Ve,position:new O,halfWidth:new O,halfHeight:new O};break}return n[e.id]=t,t}}}function db(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Me};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Me};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Me,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let fb=0;function hb(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function pb(n){const e=new ub,t=db(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new O);const r=new O,s=new Qe,o=new Qe;function a(c,d){let f=0,h=0,p=0;for(let D=0;D<9;D++)i.probe[D].set(0,0,0);let g=0,y=0,m=0,u=0,_=0,v=0,M=0,A=0,b=0,T=0,N=0;c.sort(hb);const w=d===!0?Math.PI:1;for(let D=0,V=c.length;D<V;D++){const I=c[D],G=I.color,B=I.intensity,J=I.distance,Z=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)f+=G.r*B*w,h+=G.g*B*w,p+=G.b*B*w;else if(I.isLightProbe){for(let P=0;P<9;P++)i.probe[P].addScaledVector(I.sh.coefficients[P],B);N++}else if(I.isDirectionalLight){const P=e.get(I);if(P.color.copy(I.color).multiplyScalar(I.intensity*w),I.castShadow){const k=I.shadow,z=t.get(I);z.shadowBias=k.bias,z.shadowNormalBias=k.normalBias,z.shadowRadius=k.radius,z.shadowMapSize=k.mapSize,i.directionalShadow[g]=z,i.directionalShadowMap[g]=Z,i.directionalShadowMatrix[g]=I.shadow.matrix,v++}i.directional[g]=P,g++}else if(I.isSpotLight){const P=e.get(I);P.position.setFromMatrixPosition(I.matrixWorld),P.color.copy(G).multiplyScalar(B*w),P.distance=J,P.coneCos=Math.cos(I.angle),P.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),P.decay=I.decay,i.spot[m]=P;const k=I.shadow;if(I.map&&(i.spotLightMap[b]=I.map,b++,k.updateMatrices(I),I.castShadow&&T++),i.spotLightMatrix[m]=k.matrix,I.castShadow){const z=t.get(I);z.shadowBias=k.bias,z.shadowNormalBias=k.normalBias,z.shadowRadius=k.radius,z.shadowMapSize=k.mapSize,i.spotShadow[m]=z,i.spotShadowMap[m]=Z,A++}m++}else if(I.isRectAreaLight){const P=e.get(I);P.color.copy(G).multiplyScalar(B),P.halfWidth.set(I.width*.5,0,0),P.halfHeight.set(0,I.height*.5,0),i.rectArea[u]=P,u++}else if(I.isPointLight){const P=e.get(I);if(P.color.copy(I.color).multiplyScalar(I.intensity*w),P.distance=I.distance,P.decay=I.decay,I.castShadow){const k=I.shadow,z=t.get(I);z.shadowBias=k.bias,z.shadowNormalBias=k.normalBias,z.shadowRadius=k.radius,z.shadowMapSize=k.mapSize,z.shadowCameraNear=k.camera.near,z.shadowCameraFar=k.camera.far,i.pointShadow[y]=z,i.pointShadowMap[y]=Z,i.pointShadowMatrix[y]=I.shadow.matrix,M++}i.point[y]=P,y++}else if(I.isHemisphereLight){const P=e.get(I);P.skyColor.copy(I.color).multiplyScalar(B*w),P.groundColor.copy(I.groundColor).multiplyScalar(B*w),i.hemi[_]=P,_++}}u>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=he.LTC_FLOAT_1,i.rectAreaLTC2=he.LTC_FLOAT_2):(i.rectAreaLTC1=he.LTC_HALF_1,i.rectAreaLTC2=he.LTC_HALF_2)),i.ambient[0]=f,i.ambient[1]=h,i.ambient[2]=p;const S=i.hash;(S.directionalLength!==g||S.pointLength!==y||S.spotLength!==m||S.rectAreaLength!==u||S.hemiLength!==_||S.numDirectionalShadows!==v||S.numPointShadows!==M||S.numSpotShadows!==A||S.numSpotMaps!==b||S.numLightProbes!==N)&&(i.directional.length=g,i.spot.length=m,i.rectArea.length=u,i.point.length=y,i.hemi.length=_,i.directionalShadow.length=v,i.directionalShadowMap.length=v,i.pointShadow.length=M,i.pointShadowMap.length=M,i.spotShadow.length=A,i.spotShadowMap.length=A,i.directionalShadowMatrix.length=v,i.pointShadowMatrix.length=M,i.spotLightMatrix.length=A+b-T,i.spotLightMap.length=b,i.numSpotLightShadowsWithMaps=T,i.numLightProbes=N,S.directionalLength=g,S.pointLength=y,S.spotLength=m,S.rectAreaLength=u,S.hemiLength=_,S.numDirectionalShadows=v,S.numPointShadows=M,S.numSpotShadows=A,S.numSpotMaps=b,S.numLightProbes=N,i.version=fb++)}function l(c,d){let f=0,h=0,p=0,g=0,y=0;const m=d.matrixWorldInverse;for(let u=0,_=c.length;u<_;u++){const v=c[u];if(v.isDirectionalLight){const M=i.directional[f];M.direction.setFromMatrixPosition(v.matrixWorld),r.setFromMatrixPosition(v.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),f++}else if(v.isSpotLight){const M=i.spot[p];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(v.matrixWorld),r.setFromMatrixPosition(v.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),p++}else if(v.isRectAreaLight){const M=i.rectArea[g];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(m),o.identity(),s.copy(v.matrixWorld),s.premultiply(m),o.extractRotation(s),M.halfWidth.set(v.width*.5,0,0),M.halfHeight.set(0,v.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),g++}else if(v.isPointLight){const M=i.point[h];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(m),h++}else if(v.isHemisphereLight){const M=i.hemi[y];M.direction.setFromMatrixPosition(v.matrixWorld),M.direction.transformDirection(m),y++}}}return{setup:a,setupView:l,state:i}}function eg(n){const e=new pb(n),t=[],i=[];function r(d){c.camera=d,t.length=0,i.length=0}function s(d){t.push(d)}function o(d){i.push(d)}function a(d){e.setup(t,d)}function l(d){e.setupView(t,d)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function mb(n){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new eg(n),e.set(r,[a])):s>=o.length?(a=new eg(n),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:t,dispose:i}}class gb extends ya{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=eE,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class vb extends ya{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const _b=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,xb=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function yb(n,e,t){let i=new ih;const r=new Me,s=new Me,o=new Ut,a=new gb({depthPacking:tE}),l=new vb,c={},d=t.maxTextureSize,f={[hr]:hn,[hn]:hr,[Un]:Un},h=new Vt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Me},radius:{value:4}},vertexShader:_b,fragmentShader:xb}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const g=new ni;g.setAttribute("position",new Bt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const y=new At(g,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=o_;let u=this.type;this.render=function(b,T,N){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;const w=n.getRenderTarget(),S=n.getActiveCubeFace(),D=n.getActiveMipmapLevel(),V=n.state;V.setBlending(bi),V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);const I=u!==xi&&this.type===xi,G=u===xi&&this.type!==xi;for(let B=0,J=b.length;B<J;B++){const Z=b[B],P=Z.shadow;if(P===void 0){console.warn("THREE.WebGLShadowMap:",Z,"has no shadow.");continue}if(P.autoUpdate===!1&&P.needsUpdate===!1)continue;r.copy(P.mapSize);const k=P.getFrameExtents();if(r.multiply(k),s.copy(P.mapSize),(r.x>d||r.y>d)&&(r.x>d&&(s.x=Math.floor(d/k.x),r.x=s.x*k.x,P.mapSize.x=s.x),r.y>d&&(s.y=Math.floor(d/k.y),r.y=s.y*k.y,P.mapSize.y=s.y)),P.map===null||I===!0||G===!0){const H=this.type!==xi?{minFilter:Sn,magFilter:Sn}:{};P.map!==null&&P.map.dispose(),P.map=new ei(r.x,r.y,H),P.map.texture.name=Z.name+".shadowMap",P.camera.updateProjectionMatrix()}n.setRenderTarget(P.map),n.clear();const z=P.getViewportCount();for(let H=0;H<z;H++){const X=P.getViewport(H);o.set(s.x*X.x,s.y*X.y,s.x*X.z,s.y*X.w),V.viewport(o),P.updateMatrices(Z,H),i=P.getFrustum(),M(T,N,P.camera,Z,this.type)}P.isPointLightShadow!==!0&&this.type===xi&&_(P,N),P.needsUpdate=!1}u=this.type,m.needsUpdate=!1,n.setRenderTarget(w,S,D)};function _(b,T){const N=e.update(y);h.defines.VSM_SAMPLES!==b.blurSamples&&(h.defines.VSM_SAMPLES=b.blurSamples,p.defines.VSM_SAMPLES=b.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new ei(r.x,r.y)),h.uniforms.shadow_pass.value=b.map.texture,h.uniforms.resolution.value=b.mapSize,h.uniforms.radius.value=b.radius,n.setRenderTarget(b.mapPass),n.clear(),n.renderBufferDirect(T,null,N,h,y,null),p.uniforms.shadow_pass.value=b.mapPass.texture,p.uniforms.resolution.value=b.mapSize,p.uniforms.radius.value=b.radius,n.setRenderTarget(b.map),n.clear(),n.renderBufferDirect(T,null,N,p,y,null)}function v(b,T,N,w){let S=null;const D=N.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(D!==void 0)S=D;else if(S=N.isPointLight===!0?l:a,n.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const V=S.uuid,I=T.uuid;let G=c[V];G===void 0&&(G={},c[V]=G);let B=G[I];B===void 0&&(B=S.clone(),G[I]=B,T.addEventListener("dispose",A)),S=B}if(S.visible=T.visible,S.wireframe=T.wireframe,w===xi?S.side=T.shadowSide!==null?T.shadowSide:T.side:S.side=T.shadowSide!==null?T.shadowSide:f[T.side],S.alphaMap=T.alphaMap,S.alphaTest=T.alphaTest,S.map=T.map,S.clipShadows=T.clipShadows,S.clippingPlanes=T.clippingPlanes,S.clipIntersection=T.clipIntersection,S.displacementMap=T.displacementMap,S.displacementScale=T.displacementScale,S.displacementBias=T.displacementBias,S.wireframeLinewidth=T.wireframeLinewidth,S.linewidth=T.linewidth,N.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const V=n.properties.get(S);V.light=N}return S}function M(b,T,N,w,S){if(b.visible===!1)return;if(b.layers.test(T.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&S===xi)&&(!b.frustumCulled||i.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(N.matrixWorldInverse,b.matrixWorld);const I=e.update(b),G=b.material;if(Array.isArray(G)){const B=I.groups;for(let J=0,Z=B.length;J<Z;J++){const P=B[J],k=G[P.materialIndex];if(k&&k.visible){const z=v(b,k,w,S);b.onBeforeShadow(n,b,T,N,I,z,P),n.renderBufferDirect(N,null,I,z,b,P),b.onAfterShadow(n,b,T,N,I,z,P)}}}else if(G.visible){const B=v(b,G,w,S);b.onBeforeShadow(n,b,T,N,I,B,null),n.renderBufferDirect(N,null,I,B,b,null),b.onAfterShadow(n,b,T,N,I,B,null)}}const V=b.children;for(let I=0,G=V.length;I<G;I++)M(V[I],T,N,w,S)}function A(b){b.target.removeEventListener("dispose",A);for(const N in c){const w=c[N],S=b.target.uuid;S in w&&(w[S].dispose(),delete w[S])}}}function Mb(n){function e(){let E=!1;const j=new Ut;let Y=null;const se=new Ut(0,0,0,0);return{setMask:function(de){Y!==de&&!E&&(n.colorMask(de,de,de,de),Y=de)},setLocked:function(de){E=de},setClear:function(de,ze,$e,mt,Lt){Lt===!0&&(de*=mt,ze*=mt,$e*=mt),j.set(de,ze,$e,mt),se.equals(j)===!1&&(n.clearColor(de,ze,$e,mt),se.copy(j))},reset:function(){E=!1,Y=null,se.set(-1,0,0,0)}}}function t(){let E=!1,j=null,Y=null,se=null;return{setTest:function(de){de?ie(n.DEPTH_TEST):re(n.DEPTH_TEST)},setMask:function(de){j!==de&&!E&&(n.depthMask(de),j=de)},setFunc:function(de){if(Y!==de){switch(de){case LS:n.depthFunc(n.NEVER);break;case IS:n.depthFunc(n.ALWAYS);break;case DS:n.depthFunc(n.LESS);break;case Kl:n.depthFunc(n.LEQUAL);break;case US:n.depthFunc(n.EQUAL);break;case FS:n.depthFunc(n.GEQUAL);break;case OS:n.depthFunc(n.GREATER);break;case kS:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Y=de}},setLocked:function(de){E=de},setClear:function(de){se!==de&&(n.clearDepth(de),se=de)},reset:function(){E=!1,j=null,Y=null,se=null}}}function i(){let E=!1,j=null,Y=null,se=null,de=null,ze=null,$e=null,mt=null,Lt=null;return{setTest:function(et){E||(et?ie(n.STENCIL_TEST):re(n.STENCIL_TEST))},setMask:function(et){j!==et&&!E&&(n.stencilMask(et),j=et)},setFunc:function(et,Et,ut){(Y!==et||se!==Et||de!==ut)&&(n.stencilFunc(et,Et,ut),Y=et,se=Et,de=ut)},setOp:function(et,Et,ut){(ze!==et||$e!==Et||mt!==ut)&&(n.stencilOp(et,Et,ut),ze=et,$e=Et,mt=ut)},setLocked:function(et){E=et},setClear:function(et){Lt!==et&&(n.clearStencil(et),Lt=et)},reset:function(){E=!1,j=null,Y=null,se=null,de=null,ze=null,$e=null,mt=null,Lt=null}}}const r=new e,s=new t,o=new i,a=new WeakMap,l=new WeakMap;let c={},d={},f=new WeakMap,h=[],p=null,g=!1,y=null,m=null,u=null,_=null,v=null,M=null,A=null,b=new Ve(0,0,0),T=0,N=!1,w=null,S=null,D=null,V=null,I=null;const G=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,J=0;const Z=n.getParameter(n.VERSION);Z.indexOf("WebGL")!==-1?(J=parseFloat(/^WebGL (\d)/.exec(Z)[1]),B=J>=1):Z.indexOf("OpenGL ES")!==-1&&(J=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),B=J>=2);let P=null,k={};const z=n.getParameter(n.SCISSOR_BOX),H=n.getParameter(n.VIEWPORT),X=new Ut().fromArray(z),ue=new Ut().fromArray(H);function U(E,j,Y,se){const de=new Uint8Array(4),ze=n.createTexture();n.bindTexture(E,ze),n.texParameteri(E,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(E,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let $e=0;$e<Y;$e++)E===n.TEXTURE_3D||E===n.TEXTURE_2D_ARRAY?n.texImage3D(j,0,n.RGBA,1,1,se,0,n.RGBA,n.UNSIGNED_BYTE,de):n.texImage2D(j+$e,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,de);return ze}const ee={};ee[n.TEXTURE_2D]=U(n.TEXTURE_2D,n.TEXTURE_2D,1),ee[n.TEXTURE_CUBE_MAP]=U(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),ee[n.TEXTURE_2D_ARRAY]=U(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),ee[n.TEXTURE_3D]=U(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),o.setClear(0),ie(n.DEPTH_TEST),s.setFunc(Kl),be(!1),Re(Up),ie(n.CULL_FACE),We(bi);function ie(E){c[E]!==!0&&(n.enable(E),c[E]=!0)}function re(E){c[E]!==!1&&(n.disable(E),c[E]=!1)}function Ne(E,j){return d[E]!==j?(n.bindFramebuffer(E,j),d[E]=j,E===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=j),E===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=j),!0):!1}function Ue(E,j){let Y=h,se=!1;if(E){Y=f.get(j),Y===void 0&&(Y=[],f.set(j,Y));const de=E.textures;if(Y.length!==de.length||Y[0]!==n.COLOR_ATTACHMENT0){for(let ze=0,$e=de.length;ze<$e;ze++)Y[ze]=n.COLOR_ATTACHMENT0+ze;Y.length=de.length,se=!0}}else Y[0]!==n.BACK&&(Y[0]=n.BACK,se=!0);se&&n.drawBuffers(Y)}function F(E){return p!==E?(n.useProgram(E),p=E,!0):!1}const ye={[Nr]:n.FUNC_ADD,[mS]:n.FUNC_SUBTRACT,[gS]:n.FUNC_REVERSE_SUBTRACT};ye[vS]=n.MIN,ye[_S]=n.MAX;const ce={[xS]:n.ZERO,[yS]:n.ONE,[MS]:n.SRC_COLOR,[$d]:n.SRC_ALPHA,[bS]:n.SRC_ALPHA_SATURATE,[TS]:n.DST_COLOR,[ES]:n.DST_ALPHA,[SS]:n.ONE_MINUS_SRC_COLOR,[Yd]:n.ONE_MINUS_SRC_ALPHA,[AS]:n.ONE_MINUS_DST_COLOR,[wS]:n.ONE_MINUS_DST_ALPHA,[CS]:n.CONSTANT_COLOR,[RS]:n.ONE_MINUS_CONSTANT_COLOR,[PS]:n.CONSTANT_ALPHA,[NS]:n.ONE_MINUS_CONSTANT_ALPHA};function We(E,j,Y,se,de,ze,$e,mt,Lt,et){if(E===bi){g===!0&&(re(n.BLEND),g=!1);return}if(g===!1&&(ie(n.BLEND),g=!0),E!==pS){if(E!==y||et!==N){if((m!==Nr||v!==Nr)&&(n.blendEquation(n.FUNC_ADD),m=Nr,v=Nr),et)switch(E){case Fs:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Xd:n.blendFunc(n.ONE,n.ONE);break;case Fp:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Op:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",E);break}else switch(E){case Fs:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Xd:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case Fp:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Op:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",E);break}u=null,_=null,M=null,A=null,b.set(0,0,0),T=0,y=E,N=et}return}de=de||j,ze=ze||Y,$e=$e||se,(j!==m||de!==v)&&(n.blendEquationSeparate(ye[j],ye[de]),m=j,v=de),(Y!==u||se!==_||ze!==M||$e!==A)&&(n.blendFuncSeparate(ce[Y],ce[se],ce[ze],ce[$e]),u=Y,_=se,M=ze,A=$e),(mt.equals(b)===!1||Lt!==T)&&(n.blendColor(mt.r,mt.g,mt.b,Lt),b.copy(mt),T=Lt),y=E,N=!1}function ve(E,j){E.side===Un?re(n.CULL_FACE):ie(n.CULL_FACE);let Y=E.side===hn;j&&(Y=!Y),be(Y),E.blending===Fs&&E.transparent===!1?We(bi):We(E.blending,E.blendEquation,E.blendSrc,E.blendDst,E.blendEquationAlpha,E.blendSrcAlpha,E.blendDstAlpha,E.blendColor,E.blendAlpha,E.premultipliedAlpha),s.setFunc(E.depthFunc),s.setTest(E.depthTest),s.setMask(E.depthWrite),r.setMask(E.colorWrite);const se=E.stencilWrite;o.setTest(se),se&&(o.setMask(E.stencilWriteMask),o.setFunc(E.stencilFunc,E.stencilRef,E.stencilFuncMask),o.setOp(E.stencilFail,E.stencilZFail,E.stencilZPass)),rt(E.polygonOffset,E.polygonOffsetFactor,E.polygonOffsetUnits),E.alphaToCoverage===!0?ie(n.SAMPLE_ALPHA_TO_COVERAGE):re(n.SAMPLE_ALPHA_TO_COVERAGE)}function be(E){w!==E&&(E?n.frontFace(n.CW):n.frontFace(n.CCW),w=E)}function Re(E){E!==fS?(ie(n.CULL_FACE),E!==S&&(E===Up?n.cullFace(n.BACK):E===hS?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):re(n.CULL_FACE),S=E}function Ie(E){E!==D&&(B&&n.lineWidth(E),D=E)}function rt(E,j,Y){E?(ie(n.POLYGON_OFFSET_FILL),(V!==j||I!==Y)&&(n.polygonOffset(j,Y),V=j,I=Y)):re(n.POLYGON_OFFSET_FILL)}function L(E){E?ie(n.SCISSOR_TEST):re(n.SCISSOR_TEST)}function C(E){E===void 0&&(E=n.TEXTURE0+G-1),P!==E&&(n.activeTexture(E),P=E)}function $(E,j,Y){Y===void 0&&(P===null?Y=n.TEXTURE0+G-1:Y=P);let se=k[Y];se===void 0&&(se={type:void 0,texture:void 0},k[Y]=se),(se.type!==E||se.texture!==j)&&(P!==Y&&(n.activeTexture(Y),P=Y),n.bindTexture(E,j||ee[E]),se.type=E,se.texture=j)}function ne(){const E=k[P];E!==void 0&&E.type!==void 0&&(n.bindTexture(E.type,null),E.type=void 0,E.texture=void 0)}function oe(){try{n.compressedTexImage2D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function ae(){try{n.compressedTexImage3D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ae(){try{n.texSubImage2D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function me(){try{n.texSubImage3D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function pe(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function De(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function fe(){try{n.texStorage2D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Te(){try{n.texStorage3D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ze(){try{n.texImage2D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ce(){try{n.texImage3D.apply(n,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function xe(E){X.equals(E)===!1&&(n.scissor(E.x,E.y,E.z,E.w),X.copy(E))}function ke(E){ue.equals(E)===!1&&(n.viewport(E.x,E.y,E.z,E.w),ue.copy(E))}function Xe(E,j){let Y=l.get(j);Y===void 0&&(Y=new WeakMap,l.set(j,Y));let se=Y.get(E);se===void 0&&(se=n.getUniformBlockIndex(j,E.name),Y.set(E,se))}function at(E,j){const se=l.get(j).get(E);a.get(j)!==se&&(n.uniformBlockBinding(j,se,E.__bindingPointIndex),a.set(j,se))}function He(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),c={},P=null,k={},d={},f=new WeakMap,h=[],p=null,g=!1,y=null,m=null,u=null,_=null,v=null,M=null,A=null,b=new Ve(0,0,0),T=0,N=!1,w=null,S=null,D=null,V=null,I=null,X.set(0,0,n.canvas.width,n.canvas.height),ue.set(0,0,n.canvas.width,n.canvas.height),r.reset(),s.reset(),o.reset()}return{buffers:{color:r,depth:s,stencil:o},enable:ie,disable:re,bindFramebuffer:Ne,drawBuffers:Ue,useProgram:F,setBlending:We,setMaterial:ve,setFlipSided:be,setCullFace:Re,setLineWidth:Ie,setPolygonOffset:rt,setScissorTest:L,activeTexture:C,bindTexture:$,unbindTexture:ne,compressedTexImage2D:oe,compressedTexImage3D:ae,texImage2D:Ze,texImage3D:Ce,updateUBOMapping:Xe,uniformBlockBinding:at,texStorage2D:fe,texStorage3D:Te,texSubImage2D:Ae,texSubImage3D:me,compressedTexSubImage2D:pe,compressedTexSubImage3D:De,scissor:xe,viewport:ke,reset:He}}function Sb(n,e,t,i,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Me,d=new WeakMap;let f;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(L,C){return p?new OffscreenCanvas(L,C):ic("canvas")}function y(L,C,$){let ne=1;const oe=rt(L);if((oe.width>$||oe.height>$)&&(ne=$/Math.max(oe.width,oe.height)),ne<1)if(typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&L instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&L instanceof ImageBitmap||typeof VideoFrame<"u"&&L instanceof VideoFrame){const ae=Math.floor(ne*oe.width),Ae=Math.floor(ne*oe.height);f===void 0&&(f=g(ae,Ae));const me=C?g(ae,Ae):f;return me.width=ae,me.height=Ae,me.getContext("2d").drawImage(L,0,0,ae,Ae),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+oe.width+"x"+oe.height+") to ("+ae+"x"+Ae+")."),me}else return"data"in L&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+oe.width+"x"+oe.height+")."),L;return L}function m(L){return L.generateMipmaps&&L.minFilter!==Sn&&L.minFilter!==Fn}function u(L){n.generateMipmap(L)}function _(L,C,$,ne,oe=!1){if(L!==null){if(n[L]!==void 0)return n[L];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+L+"'")}let ae=C;if(C===n.RED&&($===n.FLOAT&&(ae=n.R32F),$===n.HALF_FLOAT&&(ae=n.R16F),$===n.UNSIGNED_BYTE&&(ae=n.R8)),C===n.RED_INTEGER&&($===n.UNSIGNED_BYTE&&(ae=n.R8UI),$===n.UNSIGNED_SHORT&&(ae=n.R16UI),$===n.UNSIGNED_INT&&(ae=n.R32UI),$===n.BYTE&&(ae=n.R8I),$===n.SHORT&&(ae=n.R16I),$===n.INT&&(ae=n.R32I)),C===n.RG&&($===n.FLOAT&&(ae=n.RG32F),$===n.HALF_FLOAT&&(ae=n.RG16F),$===n.UNSIGNED_BYTE&&(ae=n.RG8)),C===n.RG_INTEGER&&($===n.UNSIGNED_BYTE&&(ae=n.RG8UI),$===n.UNSIGNED_SHORT&&(ae=n.RG16UI),$===n.UNSIGNED_INT&&(ae=n.RG32UI),$===n.BYTE&&(ae=n.RG8I),$===n.SHORT&&(ae=n.RG16I),$===n.INT&&(ae=n.RG32I)),C===n.RGB&&$===n.UNSIGNED_INT_5_9_9_9_REV&&(ae=n.RGB9_E5),C===n.RGBA){const Ae=oe?Ql:st.getTransfer(ne);$===n.FLOAT&&(ae=n.RGBA32F),$===n.HALF_FLOAT&&(ae=n.RGBA16F),$===n.UNSIGNED_BYTE&&(ae=Ae===lt?n.SRGB8_ALPHA8:n.RGBA8),$===n.UNSIGNED_SHORT_4_4_4_4&&(ae=n.RGBA4),$===n.UNSIGNED_SHORT_5_5_5_1&&(ae=n.RGB5_A1)}return(ae===n.R16F||ae===n.R32F||ae===n.RG16F||ae===n.RG32F||ae===n.RGBA16F||ae===n.RGBA32F)&&e.get("EXT_color_buffer_float"),ae}function v(L,C){return m(L)===!0||L.isFramebufferTexture&&L.minFilter!==Sn&&L.minFilter!==Fn?Math.log2(Math.max(C.width,C.height))+1:L.mipmaps!==void 0&&L.mipmaps.length>0?L.mipmaps.length:L.isCompressedTexture&&Array.isArray(L.image)?C.mipmaps.length:1}function M(L){const C=L.target;C.removeEventListener("dispose",M),b(C),C.isVideoTexture&&d.delete(C)}function A(L){const C=L.target;C.removeEventListener("dispose",A),N(C)}function b(L){const C=i.get(L);if(C.__webglInit===void 0)return;const $=L.source,ne=h.get($);if(ne){const oe=ne[C.__cacheKey];oe.usedTimes--,oe.usedTimes===0&&T(L),Object.keys(ne).length===0&&h.delete($)}i.remove(L)}function T(L){const C=i.get(L);n.deleteTexture(C.__webglTexture);const $=L.source,ne=h.get($);delete ne[C.__cacheKey],o.memory.textures--}function N(L){const C=i.get(L);if(L.depthTexture&&L.depthTexture.dispose(),L.isWebGLCubeRenderTarget)for(let ne=0;ne<6;ne++){if(Array.isArray(C.__webglFramebuffer[ne]))for(let oe=0;oe<C.__webglFramebuffer[ne].length;oe++)n.deleteFramebuffer(C.__webglFramebuffer[ne][oe]);else n.deleteFramebuffer(C.__webglFramebuffer[ne]);C.__webglDepthbuffer&&n.deleteRenderbuffer(C.__webglDepthbuffer[ne])}else{if(Array.isArray(C.__webglFramebuffer))for(let ne=0;ne<C.__webglFramebuffer.length;ne++)n.deleteFramebuffer(C.__webglFramebuffer[ne]);else n.deleteFramebuffer(C.__webglFramebuffer);if(C.__webglDepthbuffer&&n.deleteRenderbuffer(C.__webglDepthbuffer),C.__webglMultisampledFramebuffer&&n.deleteFramebuffer(C.__webglMultisampledFramebuffer),C.__webglColorRenderbuffer)for(let ne=0;ne<C.__webglColorRenderbuffer.length;ne++)C.__webglColorRenderbuffer[ne]&&n.deleteRenderbuffer(C.__webglColorRenderbuffer[ne]);C.__webglDepthRenderbuffer&&n.deleteRenderbuffer(C.__webglDepthRenderbuffer)}const $=L.textures;for(let ne=0,oe=$.length;ne<oe;ne++){const ae=i.get($[ne]);ae.__webglTexture&&(n.deleteTexture(ae.__webglTexture),o.memory.textures--),i.remove($[ne])}i.remove(L)}let w=0;function S(){w=0}function D(){const L=w;return L>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+L+" texture units while this GPU supports only "+r.maxTextures),w+=1,L}function V(L){const C=[];return C.push(L.wrapS),C.push(L.wrapT),C.push(L.wrapR||0),C.push(L.magFilter),C.push(L.minFilter),C.push(L.anisotropy),C.push(L.internalFormat),C.push(L.format),C.push(L.type),C.push(L.generateMipmaps),C.push(L.premultiplyAlpha),C.push(L.flipY),C.push(L.unpackAlignment),C.push(L.colorSpace),C.join()}function I(L,C){const $=i.get(L);if(L.isVideoTexture&&Re(L),L.isRenderTargetTexture===!1&&L.version>0&&$.__version!==L.version){const ne=L.image;if(ne===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ne.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X($,L,C);return}}t.bindTexture(n.TEXTURE_2D,$.__webglTexture,n.TEXTURE0+C)}function G(L,C){const $=i.get(L);if(L.version>0&&$.__version!==L.version){X($,L,C);return}t.bindTexture(n.TEXTURE_2D_ARRAY,$.__webglTexture,n.TEXTURE0+C)}function B(L,C){const $=i.get(L);if(L.version>0&&$.__version!==L.version){X($,L,C);return}t.bindTexture(n.TEXTURE_3D,$.__webglTexture,n.TEXTURE0+C)}function J(L,C){const $=i.get(L);if(L.version>0&&$.__version!==L.version){ue($,L,C);return}t.bindTexture(n.TEXTURE_CUBE_MAP,$.__webglTexture,n.TEXTURE0+C)}const Z={[Zl]:n.REPEAT,[Zi]:n.CLAMP_TO_EDGE,[Jl]:n.MIRRORED_REPEAT},P={[Sn]:n.NEAREST,[m_]:n.NEAREST_MIPMAP_NEAREST,[No]:n.NEAREST_MIPMAP_LINEAR,[Fn]:n.LINEAR,[Sl]:n.LINEAR_MIPMAP_NEAREST,[Ji]:n.LINEAR_MIPMAP_LINEAR},k={[iE]:n.NEVER,[cE]:n.ALWAYS,[rE]:n.LESS,[w_]:n.LEQUAL,[sE]:n.EQUAL,[lE]:n.GEQUAL,[oE]:n.GREATER,[aE]:n.NOTEQUAL};function z(L,C){if(C.type===Qi&&e.has("OES_texture_float_linear")===!1&&(C.magFilter===Fn||C.magFilter===Sl||C.magFilter===No||C.magFilter===Ji||C.minFilter===Fn||C.minFilter===Sl||C.minFilter===No||C.minFilter===Ji)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(L,n.TEXTURE_WRAP_S,Z[C.wrapS]),n.texParameteri(L,n.TEXTURE_WRAP_T,Z[C.wrapT]),(L===n.TEXTURE_3D||L===n.TEXTURE_2D_ARRAY)&&n.texParameteri(L,n.TEXTURE_WRAP_R,Z[C.wrapR]),n.texParameteri(L,n.TEXTURE_MAG_FILTER,P[C.magFilter]),n.texParameteri(L,n.TEXTURE_MIN_FILTER,P[C.minFilter]),C.compareFunction&&(n.texParameteri(L,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(L,n.TEXTURE_COMPARE_FUNC,k[C.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(C.magFilter===Sn||C.minFilter!==No&&C.minFilter!==Ji||C.type===Qi&&e.has("OES_texture_float_linear")===!1)return;if(C.anisotropy>1||i.get(C).__currentAnisotropy){const $=e.get("EXT_texture_filter_anisotropic");n.texParameterf(L,$.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(C.anisotropy,r.getMaxAnisotropy())),i.get(C).__currentAnisotropy=C.anisotropy}}}function H(L,C){let $=!1;L.__webglInit===void 0&&(L.__webglInit=!0,C.addEventListener("dispose",M));const ne=C.source;let oe=h.get(ne);oe===void 0&&(oe={},h.set(ne,oe));const ae=V(C);if(ae!==L.__cacheKey){oe[ae]===void 0&&(oe[ae]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,$=!0),oe[ae].usedTimes++;const Ae=oe[L.__cacheKey];Ae!==void 0&&(oe[L.__cacheKey].usedTimes--,Ae.usedTimes===0&&T(C)),L.__cacheKey=ae,L.__webglTexture=oe[ae].texture}return $}function X(L,C,$){let ne=n.TEXTURE_2D;(C.isDataArrayTexture||C.isCompressedArrayTexture)&&(ne=n.TEXTURE_2D_ARRAY),C.isData3DTexture&&(ne=n.TEXTURE_3D);const oe=H(L,C),ae=C.source;t.bindTexture(ne,L.__webglTexture,n.TEXTURE0+$);const Ae=i.get(ae);if(ae.version!==Ae.__version||oe===!0){t.activeTexture(n.TEXTURE0+$);const me=st.getPrimaries(st.workingColorSpace),pe=C.colorSpace===Si?null:st.getPrimaries(C.colorSpace),De=C.colorSpace===Si||me===pe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,C.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,C.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,De);let fe=y(C.image,!1,r.maxTextureSize);fe=Ie(C,fe);const Te=s.convert(C.format,C.colorSpace),Ze=s.convert(C.type);let Ce=_(C.internalFormat,Te,Ze,C.colorSpace,C.isVideoTexture);z(ne,C);let xe;const ke=C.mipmaps,Xe=C.isVideoTexture!==!0,at=Ae.__version===void 0||oe===!0,He=ae.dataReady,E=v(C,fe);if(C.isDepthTexture)Ce=n.DEPTH_COMPONENT16,C.type===Qi?Ce=n.DEPTH_COMPONENT32F:C.type===Ks?Ce=n.DEPTH_COMPONENT24:C.type===xa&&(Ce=n.DEPTH24_STENCIL8),at&&(Xe?t.texStorage2D(n.TEXTURE_2D,1,Ce,fe.width,fe.height):t.texImage2D(n.TEXTURE_2D,0,Ce,fe.width,fe.height,0,Te,Ze,null));else if(C.isDataTexture)if(ke.length>0){Xe&&at&&t.texStorage2D(n.TEXTURE_2D,E,Ce,ke[0].width,ke[0].height);for(let j=0,Y=ke.length;j<Y;j++)xe=ke[j],Xe?He&&t.texSubImage2D(n.TEXTURE_2D,j,0,0,xe.width,xe.height,Te,Ze,xe.data):t.texImage2D(n.TEXTURE_2D,j,Ce,xe.width,xe.height,0,Te,Ze,xe.data);C.generateMipmaps=!1}else Xe?(at&&t.texStorage2D(n.TEXTURE_2D,E,Ce,fe.width,fe.height),He&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,fe.width,fe.height,Te,Ze,fe.data)):t.texImage2D(n.TEXTURE_2D,0,Ce,fe.width,fe.height,0,Te,Ze,fe.data);else if(C.isCompressedTexture)if(C.isCompressedArrayTexture){Xe&&at&&t.texStorage3D(n.TEXTURE_2D_ARRAY,E,Ce,ke[0].width,ke[0].height,fe.depth);for(let j=0,Y=ke.length;j<Y;j++)xe=ke[j],C.format!==Zn?Te!==null?Xe?He&&t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,j,0,0,0,xe.width,xe.height,fe.depth,Te,xe.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,j,Ce,xe.width,xe.height,fe.depth,0,xe.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Xe?He&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,j,0,0,0,xe.width,xe.height,fe.depth,Te,Ze,xe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,j,Ce,xe.width,xe.height,fe.depth,0,Te,Ze,xe.data)}else{Xe&&at&&t.texStorage2D(n.TEXTURE_2D,E,Ce,ke[0].width,ke[0].height);for(let j=0,Y=ke.length;j<Y;j++)xe=ke[j],C.format!==Zn?Te!==null?Xe?He&&t.compressedTexSubImage2D(n.TEXTURE_2D,j,0,0,xe.width,xe.height,Te,xe.data):t.compressedTexImage2D(n.TEXTURE_2D,j,Ce,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Xe?He&&t.texSubImage2D(n.TEXTURE_2D,j,0,0,xe.width,xe.height,Te,Ze,xe.data):t.texImage2D(n.TEXTURE_2D,j,Ce,xe.width,xe.height,0,Te,Ze,xe.data)}else if(C.isDataArrayTexture)Xe?(at&&t.texStorage3D(n.TEXTURE_2D_ARRAY,E,Ce,fe.width,fe.height,fe.depth),He&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,fe.width,fe.height,fe.depth,Te,Ze,fe.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,Ce,fe.width,fe.height,fe.depth,0,Te,Ze,fe.data);else if(C.isData3DTexture)Xe?(at&&t.texStorage3D(n.TEXTURE_3D,E,Ce,fe.width,fe.height,fe.depth),He&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,fe.width,fe.height,fe.depth,Te,Ze,fe.data)):t.texImage3D(n.TEXTURE_3D,0,Ce,fe.width,fe.height,fe.depth,0,Te,Ze,fe.data);else if(C.isFramebufferTexture){if(at)if(Xe)t.texStorage2D(n.TEXTURE_2D,E,Ce,fe.width,fe.height);else{let j=fe.width,Y=fe.height;for(let se=0;se<E;se++)t.texImage2D(n.TEXTURE_2D,se,Ce,j,Y,0,Te,Ze,null),j>>=1,Y>>=1}}else if(ke.length>0){if(Xe&&at){const j=rt(ke[0]);t.texStorage2D(n.TEXTURE_2D,E,Ce,j.width,j.height)}for(let j=0,Y=ke.length;j<Y;j++)xe=ke[j],Xe?He&&t.texSubImage2D(n.TEXTURE_2D,j,0,0,Te,Ze,xe):t.texImage2D(n.TEXTURE_2D,j,Ce,Te,Ze,xe);C.generateMipmaps=!1}else if(Xe){if(at){const j=rt(fe);t.texStorage2D(n.TEXTURE_2D,E,Ce,j.width,j.height)}He&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,Te,Ze,fe)}else t.texImage2D(n.TEXTURE_2D,0,Ce,Te,Ze,fe);m(C)&&u(ne),Ae.__version=ae.version,C.onUpdate&&C.onUpdate(C)}L.__version=C.version}function ue(L,C,$){if(C.image.length!==6)return;const ne=H(L,C),oe=C.source;t.bindTexture(n.TEXTURE_CUBE_MAP,L.__webglTexture,n.TEXTURE0+$);const ae=i.get(oe);if(oe.version!==ae.__version||ne===!0){t.activeTexture(n.TEXTURE0+$);const Ae=st.getPrimaries(st.workingColorSpace),me=C.colorSpace===Si?null:st.getPrimaries(C.colorSpace),pe=C.colorSpace===Si||Ae===me?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,C.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,C.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,pe);const De=C.isCompressedTexture||C.image[0].isCompressedTexture,fe=C.image[0]&&C.image[0].isDataTexture,Te=[];for(let Y=0;Y<6;Y++)!De&&!fe?Te[Y]=y(C.image[Y],!0,r.maxCubemapSize):Te[Y]=fe?C.image[Y].image:C.image[Y],Te[Y]=Ie(C,Te[Y]);const Ze=Te[0],Ce=s.convert(C.format,C.colorSpace),xe=s.convert(C.type),ke=_(C.internalFormat,Ce,xe,C.colorSpace),Xe=C.isVideoTexture!==!0,at=ae.__version===void 0||ne===!0,He=oe.dataReady;let E=v(C,Ze);z(n.TEXTURE_CUBE_MAP,C);let j;if(De){Xe&&at&&t.texStorage2D(n.TEXTURE_CUBE_MAP,E,ke,Ze.width,Ze.height);for(let Y=0;Y<6;Y++){j=Te[Y].mipmaps;for(let se=0;se<j.length;se++){const de=j[se];C.format!==Zn?Ce!==null?Xe?He&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se,0,0,de.width,de.height,Ce,de.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se,ke,de.width,de.height,0,de.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Xe?He&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se,0,0,de.width,de.height,Ce,xe,de.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se,ke,de.width,de.height,0,Ce,xe,de.data)}}}else{if(j=C.mipmaps,Xe&&at){j.length>0&&E++;const Y=rt(Te[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,E,ke,Y.width,Y.height)}for(let Y=0;Y<6;Y++)if(fe){Xe?He&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,Te[Y].width,Te[Y].height,Ce,xe,Te[Y].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,ke,Te[Y].width,Te[Y].height,0,Ce,xe,Te[Y].data);for(let se=0;se<j.length;se++){const ze=j[se].image[Y].image;Xe?He&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se+1,0,0,ze.width,ze.height,Ce,xe,ze.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se+1,ke,ze.width,ze.height,0,Ce,xe,ze.data)}}else{Xe?He&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,Ce,xe,Te[Y]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,ke,Ce,xe,Te[Y]);for(let se=0;se<j.length;se++){const de=j[se];Xe?He&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se+1,0,0,Ce,xe,de.image[Y]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,se+1,ke,Ce,xe,de.image[Y])}}}m(C)&&u(n.TEXTURE_CUBE_MAP),ae.__version=oe.version,C.onUpdate&&C.onUpdate(C)}L.__version=C.version}function U(L,C,$,ne,oe,ae){const Ae=s.convert($.format,$.colorSpace),me=s.convert($.type),pe=_($.internalFormat,Ae,me,$.colorSpace);if(!i.get(C).__hasExternalTextures){const fe=Math.max(1,C.width>>ae),Te=Math.max(1,C.height>>ae);oe===n.TEXTURE_3D||oe===n.TEXTURE_2D_ARRAY?t.texImage3D(oe,ae,pe,fe,Te,C.depth,0,Ae,me,null):t.texImage2D(oe,ae,pe,fe,Te,0,Ae,me,null)}t.bindFramebuffer(n.FRAMEBUFFER,L),be(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ne,oe,i.get($).__webglTexture,0,ve(C)):(oe===n.TEXTURE_2D||oe>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&oe<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ne,oe,i.get($).__webglTexture,ae),t.bindFramebuffer(n.FRAMEBUFFER,null)}function ee(L,C,$){if(n.bindRenderbuffer(n.RENDERBUFFER,L),C.depthBuffer&&!C.stencilBuffer){let ne=n.DEPTH_COMPONENT24;if($||be(C)){const oe=C.depthTexture;oe&&oe.isDepthTexture&&(oe.type===Qi?ne=n.DEPTH_COMPONENT32F:oe.type===Ks&&(ne=n.DEPTH_COMPONENT24));const ae=ve(C);be(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ae,ne,C.width,C.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,ae,ne,C.width,C.height)}else n.renderbufferStorage(n.RENDERBUFFER,ne,C.width,C.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,L)}else if(C.depthBuffer&&C.stencilBuffer){const ne=ve(C);$&&be(C)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,ne,n.DEPTH24_STENCIL8,C.width,C.height):be(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ne,n.DEPTH24_STENCIL8,C.width,C.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,L)}else{const ne=C.textures;for(let oe=0;oe<ne.length;oe++){const ae=ne[oe],Ae=s.convert(ae.format,ae.colorSpace),me=s.convert(ae.type),pe=_(ae.internalFormat,Ae,me,ae.colorSpace),De=ve(C);$&&be(C)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,De,pe,C.width,C.height):be(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,De,pe,C.width,C.height):n.renderbufferStorage(n.RENDERBUFFER,pe,C.width,C.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ie(L,C){if(C&&C.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,L),!(C.depthTexture&&C.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(C.depthTexture).__webglTexture||C.depthTexture.image.width!==C.width||C.depthTexture.image.height!==C.height)&&(C.depthTexture.image.width=C.width,C.depthTexture.image.height=C.height,C.depthTexture.needsUpdate=!0),I(C.depthTexture,0);const ne=i.get(C.depthTexture).__webglTexture,oe=ve(C);if(C.depthTexture.format===Os)be(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ne,0,oe):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ne,0);else if(C.depthTexture.format===ua)be(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ne,0,oe):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ne,0);else throw new Error("Unknown depthTexture format")}function re(L){const C=i.get(L),$=L.isWebGLCubeRenderTarget===!0;if(L.depthTexture&&!C.__autoAllocateDepthBuffer){if($)throw new Error("target.depthTexture not supported in Cube render targets");ie(C.__webglFramebuffer,L)}else if($){C.__webglDepthbuffer=[];for(let ne=0;ne<6;ne++)t.bindFramebuffer(n.FRAMEBUFFER,C.__webglFramebuffer[ne]),C.__webglDepthbuffer[ne]=n.createRenderbuffer(),ee(C.__webglDepthbuffer[ne],L,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,C.__webglFramebuffer),C.__webglDepthbuffer=n.createRenderbuffer(),ee(C.__webglDepthbuffer,L,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ne(L,C,$){const ne=i.get(L);C!==void 0&&U(ne.__webglFramebuffer,L,L.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),$!==void 0&&re(L)}function Ue(L){const C=L.texture,$=i.get(L),ne=i.get(C);L.addEventListener("dispose",A);const oe=L.textures,ae=L.isWebGLCubeRenderTarget===!0,Ae=oe.length>1;if(Ae||(ne.__webglTexture===void 0&&(ne.__webglTexture=n.createTexture()),ne.__version=C.version,o.memory.textures++),ae){$.__webglFramebuffer=[];for(let me=0;me<6;me++)if(C.mipmaps&&C.mipmaps.length>0){$.__webglFramebuffer[me]=[];for(let pe=0;pe<C.mipmaps.length;pe++)$.__webglFramebuffer[me][pe]=n.createFramebuffer()}else $.__webglFramebuffer[me]=n.createFramebuffer()}else{if(C.mipmaps&&C.mipmaps.length>0){$.__webglFramebuffer=[];for(let me=0;me<C.mipmaps.length;me++)$.__webglFramebuffer[me]=n.createFramebuffer()}else $.__webglFramebuffer=n.createFramebuffer();if(Ae)for(let me=0,pe=oe.length;me<pe;me++){const De=i.get(oe[me]);De.__webglTexture===void 0&&(De.__webglTexture=n.createTexture(),o.memory.textures++)}if(L.samples>0&&be(L)===!1){$.__webglMultisampledFramebuffer=n.createFramebuffer(),$.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,$.__webglMultisampledFramebuffer);for(let me=0;me<oe.length;me++){const pe=oe[me];$.__webglColorRenderbuffer[me]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,$.__webglColorRenderbuffer[me]);const De=s.convert(pe.format,pe.colorSpace),fe=s.convert(pe.type),Te=_(pe.internalFormat,De,fe,pe.colorSpace,L.isXRRenderTarget===!0),Ze=ve(L);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ze,Te,L.width,L.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+me,n.RENDERBUFFER,$.__webglColorRenderbuffer[me])}n.bindRenderbuffer(n.RENDERBUFFER,null),L.depthBuffer&&($.__webglDepthRenderbuffer=n.createRenderbuffer(),ee($.__webglDepthRenderbuffer,L,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(ae){t.bindTexture(n.TEXTURE_CUBE_MAP,ne.__webglTexture),z(n.TEXTURE_CUBE_MAP,C);for(let me=0;me<6;me++)if(C.mipmaps&&C.mipmaps.length>0)for(let pe=0;pe<C.mipmaps.length;pe++)U($.__webglFramebuffer[me][pe],L,C,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+me,pe);else U($.__webglFramebuffer[me],L,C,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+me,0);m(C)&&u(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ae){for(let me=0,pe=oe.length;me<pe;me++){const De=oe[me],fe=i.get(De);t.bindTexture(n.TEXTURE_2D,fe.__webglTexture),z(n.TEXTURE_2D,De),U($.__webglFramebuffer,L,De,n.COLOR_ATTACHMENT0+me,n.TEXTURE_2D,0),m(De)&&u(n.TEXTURE_2D)}t.unbindTexture()}else{let me=n.TEXTURE_2D;if((L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(me=L.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(me,ne.__webglTexture),z(me,C),C.mipmaps&&C.mipmaps.length>0)for(let pe=0;pe<C.mipmaps.length;pe++)U($.__webglFramebuffer[pe],L,C,n.COLOR_ATTACHMENT0,me,pe);else U($.__webglFramebuffer,L,C,n.COLOR_ATTACHMENT0,me,0);m(C)&&u(me),t.unbindTexture()}L.depthBuffer&&re(L)}function F(L){const C=L.textures;for(let $=0,ne=C.length;$<ne;$++){const oe=C[$];if(m(oe)){const ae=L.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,Ae=i.get(oe).__webglTexture;t.bindTexture(ae,Ae),u(ae),t.unbindTexture()}}}const ye=[],ce=[];function We(L){if(L.samples>0){if(be(L)===!1){const C=L.textures,$=L.width,ne=L.height;let oe=n.COLOR_BUFFER_BIT;const ae=L.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ae=i.get(L),me=C.length>1;if(me)for(let pe=0;pe<C.length;pe++)t.bindFramebuffer(n.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+pe,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+pe,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ae.__webglFramebuffer);for(let pe=0;pe<C.length;pe++){if(L.resolveDepthBuffer&&(L.depthBuffer&&(oe|=n.DEPTH_BUFFER_BIT),L.stencilBuffer&&L.resolveStencilBuffer&&(oe|=n.STENCIL_BUFFER_BIT)),me){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Ae.__webglColorRenderbuffer[pe]);const De=i.get(C[pe]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,De,0)}n.blitFramebuffer(0,0,$,ne,0,0,$,ne,oe,n.NEAREST),l===!0&&(ye.length=0,ce.length=0,ye.push(n.COLOR_ATTACHMENT0+pe),L.depthBuffer&&L.resolveDepthBuffer===!1&&(ye.push(ae),ce.push(ae),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,ce)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,ye))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),me)for(let pe=0;pe<C.length;pe++){t.bindFramebuffer(n.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+pe,n.RENDERBUFFER,Ae.__webglColorRenderbuffer[pe]);const De=i.get(C[pe]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Ae.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+pe,n.TEXTURE_2D,De,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer)}else if(L.depthBuffer&&L.resolveDepthBuffer===!1&&l){const C=L.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[C])}}}function ve(L){return Math.min(r.maxSamples,L.samples)}function be(L){const C=i.get(L);return L.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&C.__useRenderToTexture!==!1}function Re(L){const C=o.render.frame;d.get(L)!==C&&(d.set(L,C),L.update())}function Ie(L,C){const $=L.colorSpace,ne=L.format,oe=L.type;return L.isCompressedTexture===!0||L.isVideoTexture===!0||$!==xr&&$!==Si&&(st.getTransfer($)===lt?(ne!==Zn||oe!==pr)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",$)),C}function rt(L){return typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement?(c.width=L.naturalWidth||L.width,c.height=L.naturalHeight||L.height):typeof VideoFrame<"u"&&L instanceof VideoFrame?(c.width=L.displayWidth,c.height=L.displayHeight):(c.width=L.width,c.height=L.height),c}this.allocateTextureUnit=D,this.resetTextureUnits=S,this.setTexture2D=I,this.setTexture2DArray=G,this.setTexture3D=B,this.setTextureCube=J,this.rebindTextures=Ne,this.setupRenderTarget=Ue,this.updateRenderTargetMipmap=F,this.updateMultisampleRenderTarget=We,this.setupDepthRenderbuffer=re,this.setupFrameBufferTexture=U,this.useMultisampledRTT=be}function Eb(n,e){function t(i,r=Si){let s;const o=st.getTransfer(r);if(i===pr)return n.UNSIGNED_BYTE;if(i===__)return n.UNSIGNED_SHORT_4_4_4_4;if(i===x_)return n.UNSIGNED_SHORT_5_5_5_1;if(i===jS)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===HS)return n.BYTE;if(i===GS)return n.SHORT;if(i===g_)return n.UNSIGNED_SHORT;if(i===v_)return n.INT;if(i===Ks)return n.UNSIGNED_INT;if(i===Qi)return n.FLOAT;if(i===ur)return n.HALF_FLOAT;if(i===WS)return n.ALPHA;if(i===XS)return n.RGB;if(i===Zn)return n.RGBA;if(i===$S)return n.LUMINANCE;if(i===YS)return n.LUMINANCE_ALPHA;if(i===Os)return n.DEPTH_COMPONENT;if(i===ua)return n.DEPTH_STENCIL;if(i===qS)return n.RED;if(i===y_)return n.RED_INTEGER;if(i===KS)return n.RG;if(i===M_)return n.RG_INTEGER;if(i===S_)return n.RGBA_INTEGER;if(i===ou||i===au||i===lu||i===cu)if(o===lt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===ou)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===au)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===lu)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===cu)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===ou)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===au)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===lu)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===cu)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===kp||i===zp||i===Bp||i===Vp)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===kp)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===zp)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Bp)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Vp)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Hp||i===Gp||i===jp)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Hp||i===Gp)return o===lt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===jp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Wp||i===Xp||i===$p||i===Yp||i===qp||i===Kp||i===Zp||i===Jp||i===Qp||i===em||i===tm||i===nm||i===im||i===rm)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===Wp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Xp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===$p)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Yp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===qp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Kp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Zp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Jp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Qp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===em)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===tm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===nm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===im)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===rm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===uu||i===sm||i===om)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===uu)return o===lt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===sm)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===om)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ZS||i===am||i===lm||i===cm)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===uu)return s.COMPRESSED_RED_RGTC1_EXT;if(i===am)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===lm)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===cm)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===xa?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}class wb extends xn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class Rs extends Ot{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Tb={type:"move"};class Uu{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Rs,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Rs,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Rs,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const y of e.hand.values()){const m=t.getJointPose(y,i),u=this._getHandJoint(c,y);m!==null&&(u.matrix.fromArray(m.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=m.radius),u.visible=m!==null}const d=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],h=d.position.distanceTo(f.position),p=.02,g=.005;c.inputState.pinching&&h>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Tb)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Rs;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const Ab=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,bb=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Cb{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){const r=new Qt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}render(e,t){if(this.texture!==null){if(this.mesh===null){const i=t.cameras[0].viewport,r=new Vt({vertexShader:Ab,fragmentShader:bb,uniforms:{depthColor:{value:this.texture},depthWidth:{value:i.z},depthHeight:{value:i.w}}});this.mesh=new At(new mr(20,20),r)}e.render(this.mesh,t)}}reset(){this.texture=null,this.mesh=null}}class Rb extends Wr{constructor(e,t){super();const i=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,d=null,f=null,h=null,p=null,g=null;const y=new Cb,m=t.getContextAttributes();let u=null,_=null;const v=[],M=[],A=new Me;let b=null;const T=new xn;T.layers.enable(1),T.viewport=new Ut;const N=new xn;N.layers.enable(2),N.viewport=new Ut;const w=[T,N],S=new wb;S.layers.enable(1),S.layers.enable(2);let D=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(U){let ee=v[U];return ee===void 0&&(ee=new Uu,v[U]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function(U){let ee=v[U];return ee===void 0&&(ee=new Uu,v[U]=ee),ee.getGripSpace()},this.getHand=function(U){let ee=v[U];return ee===void 0&&(ee=new Uu,v[U]=ee),ee.getHandSpace()};function I(U){const ee=M.indexOf(U.inputSource);if(ee===-1)return;const ie=v[ee];ie!==void 0&&(ie.update(U.inputSource,U.frame,c||o),ie.dispatchEvent({type:U.type,data:U.inputSource}))}function G(){r.removeEventListener("select",I),r.removeEventListener("selectstart",I),r.removeEventListener("selectend",I),r.removeEventListener("squeeze",I),r.removeEventListener("squeezestart",I),r.removeEventListener("squeezeend",I),r.removeEventListener("end",G),r.removeEventListener("inputsourceschange",B);for(let U=0;U<v.length;U++){const ee=M[U];ee!==null&&(M[U]=null,v[U].disconnect(ee))}D=null,V=null,y.reset(),e.setRenderTarget(u),p=null,h=null,f=null,r=null,_=null,ue.stop(),i.isPresenting=!1,e.setPixelRatio(b),e.setSize(A.width,A.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(U){s=U,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(U){a=U,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(U){c=U},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return f},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(U){if(r=U,r!==null){if(u=e.getRenderTarget(),r.addEventListener("select",I),r.addEventListener("selectstart",I),r.addEventListener("selectend",I),r.addEventListener("squeeze",I),r.addEventListener("squeezestart",I),r.addEventListener("squeezeend",I),r.addEventListener("end",G),r.addEventListener("inputsourceschange",B),m.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(A),r.renderState.layers===void 0){const ee={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};p=new XRWebGLLayer(r,t,ee),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),_=new ei(p.framebufferWidth,p.framebufferHeight,{format:Zn,type:pr,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let ee=null,ie=null,re=null;m.depth&&(re=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ee=m.stencil?ua:Os,ie=m.stencil?xa:Ks);const Ne={colorFormat:t.RGBA8,depthFormat:re,scaleFactor:s};f=new XRWebGLBinding(r,t),h=f.createProjectionLayer(Ne),r.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),_=new ei(h.textureWidth,h.textureHeight,{format:Zn,type:pr,depthTexture:new D_(h.textureWidth,h.textureHeight,ie,void 0,void 0,void 0,void 0,void 0,void 0,ee),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),ue.setContext(r),ue.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function B(U){for(let ee=0;ee<U.removed.length;ee++){const ie=U.removed[ee],re=M.indexOf(ie);re>=0&&(M[re]=null,v[re].disconnect(ie))}for(let ee=0;ee<U.added.length;ee++){const ie=U.added[ee];let re=M.indexOf(ie);if(re===-1){for(let Ue=0;Ue<v.length;Ue++)if(Ue>=M.length){M.push(ie),re=Ue;break}else if(M[Ue]===null){M[Ue]=ie,re=Ue;break}if(re===-1)break}const Ne=v[re];Ne&&Ne.connect(ie)}}const J=new O,Z=new O;function P(U,ee,ie){J.setFromMatrixPosition(ee.matrixWorld),Z.setFromMatrixPosition(ie.matrixWorld);const re=J.distanceTo(Z),Ne=ee.projectionMatrix.elements,Ue=ie.projectionMatrix.elements,F=Ne[14]/(Ne[10]-1),ye=Ne[14]/(Ne[10]+1),ce=(Ne[9]+1)/Ne[5],We=(Ne[9]-1)/Ne[5],ve=(Ne[8]-1)/Ne[0],be=(Ue[8]+1)/Ue[0],Re=F*ve,Ie=F*be,rt=re/(-ve+be),L=rt*-ve;ee.matrixWorld.decompose(U.position,U.quaternion,U.scale),U.translateX(L),U.translateZ(rt),U.matrixWorld.compose(U.position,U.quaternion,U.scale),U.matrixWorldInverse.copy(U.matrixWorld).invert();const C=F+rt,$=ye+rt,ne=Re-L,oe=Ie+(re-L),ae=ce*ye/$*C,Ae=We*ye/$*C;U.projectionMatrix.makePerspective(ne,oe,ae,Ae,C,$),U.projectionMatrixInverse.copy(U.projectionMatrix).invert()}function k(U,ee){ee===null?U.matrixWorld.copy(U.matrix):U.matrixWorld.multiplyMatrices(ee.matrixWorld,U.matrix),U.matrixWorldInverse.copy(U.matrixWorld).invert()}this.updateCamera=function(U){if(r===null)return;y.texture!==null&&(U.near=y.depthNear,U.far=y.depthFar),S.near=N.near=T.near=U.near,S.far=N.far=T.far=U.far,(D!==S.near||V!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),D=S.near,V=S.far,T.near=D,T.far=V,N.near=D,N.far=V,T.updateProjectionMatrix(),N.updateProjectionMatrix(),U.updateProjectionMatrix());const ee=U.parent,ie=S.cameras;k(S,ee);for(let re=0;re<ie.length;re++)k(ie[re],ee);ie.length===2?P(S,T,N):S.projectionMatrix.copy(T.projectionMatrix),z(U,S,ee)};function z(U,ee,ie){ie===null?U.matrix.copy(ee.matrixWorld):(U.matrix.copy(ie.matrixWorld),U.matrix.invert(),U.matrix.multiply(ee.matrixWorld)),U.matrix.decompose(U.position,U.quaternion,U.scale),U.updateMatrixWorld(!0),U.projectionMatrix.copy(ee.projectionMatrix),U.projectionMatrixInverse.copy(ee.projectionMatrixInverse),U.isPerspectiveCamera&&(U.fov=da*2*Math.atan(1/U.projectionMatrix.elements[5]),U.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(h===null&&p===null))return l},this.setFoveation=function(U){l=U,h!==null&&(h.fixedFoveation=U),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=U)},this.hasDepthSensing=function(){return y.texture!==null};let H=null;function X(U,ee){if(d=ee.getViewerPose(c||o),g=ee,d!==null){const ie=d.views;p!==null&&(e.setRenderTargetFramebuffer(_,p.framebuffer),e.setRenderTarget(_));let re=!1;ie.length!==S.cameras.length&&(S.cameras.length=0,re=!0);for(let Ue=0;Ue<ie.length;Ue++){const F=ie[Ue];let ye=null;if(p!==null)ye=p.getViewport(F);else{const We=f.getViewSubImage(h,F);ye=We.viewport,Ue===0&&(e.setRenderTargetTextures(_,We.colorTexture,h.ignoreDepthValues?void 0:We.depthStencilTexture),e.setRenderTarget(_))}let ce=w[Ue];ce===void 0&&(ce=new xn,ce.layers.enable(Ue),ce.viewport=new Ut,w[Ue]=ce),ce.matrix.fromArray(F.transform.matrix),ce.matrix.decompose(ce.position,ce.quaternion,ce.scale),ce.projectionMatrix.fromArray(F.projectionMatrix),ce.projectionMatrixInverse.copy(ce.projectionMatrix).invert(),ce.viewport.set(ye.x,ye.y,ye.width,ye.height),Ue===0&&(S.matrix.copy(ce.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),re===!0&&S.cameras.push(ce)}const Ne=r.enabledFeatures;if(Ne&&Ne.includes("depth-sensing")){const Ue=f.getDepthInformation(ie[0]);Ue&&Ue.isValid&&Ue.texture&&y.init(e,Ue,r.renderState)}}for(let ie=0;ie<v.length;ie++){const re=M[ie],Ne=v[ie];re!==null&&Ne!==void 0&&Ne.update(re,ee,c||o)}y.render(e,S),H&&H(U,ee),ee.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ee}),g=null}const ue=new I_;ue.setAnimationLoop(X),this.setAnimationLoop=function(U){H=U},this.dispose=function(){}}}const Ar=new ui,Pb=new Qe;function Nb(n,e){function t(m,u){m.matrixAutoUpdate===!0&&m.updateMatrix(),u.value.copy(m.matrix)}function i(m,u){u.color.getRGB(m.fogColor.value,P_(n)),u.isFog?(m.fogNear.value=u.near,m.fogFar.value=u.far):u.isFogExp2&&(m.fogDensity.value=u.density)}function r(m,u,_,v,M){u.isMeshBasicMaterial||u.isMeshLambertMaterial?s(m,u):u.isMeshToonMaterial?(s(m,u),f(m,u)):u.isMeshPhongMaterial?(s(m,u),d(m,u)):u.isMeshStandardMaterial?(s(m,u),h(m,u),u.isMeshPhysicalMaterial&&p(m,u,M)):u.isMeshMatcapMaterial?(s(m,u),g(m,u)):u.isMeshDepthMaterial?s(m,u):u.isMeshDistanceMaterial?(s(m,u),y(m,u)):u.isMeshNormalMaterial?s(m,u):u.isLineBasicMaterial?(o(m,u),u.isLineDashedMaterial&&a(m,u)):u.isPointsMaterial?l(m,u,_,v):u.isSpriteMaterial?c(m,u):u.isShadowMaterial?(m.color.value.copy(u.color),m.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function s(m,u){m.opacity.value=u.opacity,u.color&&m.diffuse.value.copy(u.color),u.emissive&&m.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(m.map.value=u.map,t(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.bumpMap&&(m.bumpMap.value=u.bumpMap,t(u.bumpMap,m.bumpMapTransform),m.bumpScale.value=u.bumpScale,u.side===hn&&(m.bumpScale.value*=-1)),u.normalMap&&(m.normalMap.value=u.normalMap,t(u.normalMap,m.normalMapTransform),m.normalScale.value.copy(u.normalScale),u.side===hn&&m.normalScale.value.negate()),u.displacementMap&&(m.displacementMap.value=u.displacementMap,t(u.displacementMap,m.displacementMapTransform),m.displacementScale.value=u.displacementScale,m.displacementBias.value=u.displacementBias),u.emissiveMap&&(m.emissiveMap.value=u.emissiveMap,t(u.emissiveMap,m.emissiveMapTransform)),u.specularMap&&(m.specularMap.value=u.specularMap,t(u.specularMap,m.specularMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest);const _=e.get(u),v=_.envMap,M=_.envMapRotation;if(v&&(m.envMap.value=v,Ar.copy(M),Ar.x*=-1,Ar.y*=-1,Ar.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Ar.y*=-1,Ar.z*=-1),m.envMapRotation.value.setFromMatrix4(Pb.makeRotationFromEuler(Ar)),m.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=u.reflectivity,m.ior.value=u.ior,m.refractionRatio.value=u.refractionRatio),u.lightMap){m.lightMap.value=u.lightMap;const A=n._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=u.lightMapIntensity*A,t(u.lightMap,m.lightMapTransform)}u.aoMap&&(m.aoMap.value=u.aoMap,m.aoMapIntensity.value=u.aoMapIntensity,t(u.aoMap,m.aoMapTransform))}function o(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,u.map&&(m.map.value=u.map,t(u.map,m.mapTransform))}function a(m,u){m.dashSize.value=u.dashSize,m.totalSize.value=u.dashSize+u.gapSize,m.scale.value=u.scale}function l(m,u,_,v){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.size.value=u.size*_,m.scale.value=v*.5,u.map&&(m.map.value=u.map,t(u.map,m.uvTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function c(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.rotation.value=u.rotation,u.map&&(m.map.value=u.map,t(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,t(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function d(m,u){m.specular.value.copy(u.specular),m.shininess.value=Math.max(u.shininess,1e-4)}function f(m,u){u.gradientMap&&(m.gradientMap.value=u.gradientMap)}function h(m,u){m.metalness.value=u.metalness,u.metalnessMap&&(m.metalnessMap.value=u.metalnessMap,t(u.metalnessMap,m.metalnessMapTransform)),m.roughness.value=u.roughness,u.roughnessMap&&(m.roughnessMap.value=u.roughnessMap,t(u.roughnessMap,m.roughnessMapTransform)),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)}function p(m,u,_){m.ior.value=u.ior,u.sheen>0&&(m.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),m.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(m.sheenColorMap.value=u.sheenColorMap,t(u.sheenColorMap,m.sheenColorMapTransform)),u.sheenRoughnessMap&&(m.sheenRoughnessMap.value=u.sheenRoughnessMap,t(u.sheenRoughnessMap,m.sheenRoughnessMapTransform))),u.clearcoat>0&&(m.clearcoat.value=u.clearcoat,m.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(m.clearcoatMap.value=u.clearcoatMap,t(u.clearcoatMap,m.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,t(u.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(m.clearcoatNormalMap.value=u.clearcoatNormalMap,t(u.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===hn&&m.clearcoatNormalScale.value.negate())),u.dispersion>0&&(m.dispersion.value=u.dispersion),u.iridescence>0&&(m.iridescence.value=u.iridescence,m.iridescenceIOR.value=u.iridescenceIOR,m.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(m.iridescenceMap.value=u.iridescenceMap,t(u.iridescenceMap,m.iridescenceMapTransform)),u.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=u.iridescenceThicknessMap,t(u.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),u.transmission>0&&(m.transmission.value=u.transmission,m.transmissionSamplerMap.value=_.texture,m.transmissionSamplerSize.value.set(_.width,_.height),u.transmissionMap&&(m.transmissionMap.value=u.transmissionMap,t(u.transmissionMap,m.transmissionMapTransform)),m.thickness.value=u.thickness,u.thicknessMap&&(m.thicknessMap.value=u.thicknessMap,t(u.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=u.attenuationDistance,m.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(m.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(m.anisotropyMap.value=u.anisotropyMap,t(u.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=u.specularIntensity,m.specularColor.value.copy(u.specularColor),u.specularColorMap&&(m.specularColorMap.value=u.specularColorMap,t(u.specularColorMap,m.specularColorMapTransform)),u.specularIntensityMap&&(m.specularIntensityMap.value=u.specularIntensityMap,t(u.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,u){u.matcap&&(m.matcap.value=u.matcap)}function y(m,u){const _=e.get(u).light;m.referencePosition.value.setFromMatrixPosition(_.matrixWorld),m.nearDistance.value=_.shadow.camera.near,m.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Lb(n,e,t,i){let r={},s={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,v){const M=v.program;i.uniformBlockBinding(_,M)}function c(_,v){let M=r[_.id];M===void 0&&(g(_),M=d(_),r[_.id]=M,_.addEventListener("dispose",m));const A=v.program;i.updateUBOMapping(_,A);const b=e.render.frame;s[_.id]!==b&&(h(_),s[_.id]=b)}function d(_){const v=f();_.__bindingPointIndex=v;const M=n.createBuffer(),A=_.__size,b=_.usage;return n.bindBuffer(n.UNIFORM_BUFFER,M),n.bufferData(n.UNIFORM_BUFFER,A,b),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,v,M),M}function f(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(_){const v=r[_.id],M=_.uniforms,A=_.__cache;n.bindBuffer(n.UNIFORM_BUFFER,v);for(let b=0,T=M.length;b<T;b++){const N=Array.isArray(M[b])?M[b]:[M[b]];for(let w=0,S=N.length;w<S;w++){const D=N[w];if(p(D,b,w,A)===!0){const V=D.__offset,I=Array.isArray(D.value)?D.value:[D.value];let G=0;for(let B=0;B<I.length;B++){const J=I[B],Z=y(J);typeof J=="number"||typeof J=="boolean"?(D.__data[0]=J,n.bufferSubData(n.UNIFORM_BUFFER,V+G,D.__data)):J.isMatrix3?(D.__data[0]=J.elements[0],D.__data[1]=J.elements[1],D.__data[2]=J.elements[2],D.__data[3]=0,D.__data[4]=J.elements[3],D.__data[5]=J.elements[4],D.__data[6]=J.elements[5],D.__data[7]=0,D.__data[8]=J.elements[6],D.__data[9]=J.elements[7],D.__data[10]=J.elements[8],D.__data[11]=0):(J.toArray(D.__data,G),G+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,V,D.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function p(_,v,M,A){const b=_.value,T=v+"_"+M;if(A[T]===void 0)return typeof b=="number"||typeof b=="boolean"?A[T]=b:A[T]=b.clone(),!0;{const N=A[T];if(typeof b=="number"||typeof b=="boolean"){if(N!==b)return A[T]=b,!0}else if(N.equals(b)===!1)return N.copy(b),!0}return!1}function g(_){const v=_.uniforms;let M=0;const A=16;for(let T=0,N=v.length;T<N;T++){const w=Array.isArray(v[T])?v[T]:[v[T]];for(let S=0,D=w.length;S<D;S++){const V=w[S],I=Array.isArray(V.value)?V.value:[V.value];for(let G=0,B=I.length;G<B;G++){const J=I[G],Z=y(J),P=M%A;P!==0&&A-P<Z.boundary&&(M+=A-P),V.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=M,M+=Z.storage}}}const b=M%A;return b>0&&(M+=A-b),_.__size=M,_.__cache={},this}function y(_){const v={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(v.boundary=4,v.storage=4):_.isVector2?(v.boundary=8,v.storage=8):_.isVector3||_.isColor?(v.boundary=16,v.storage=12):_.isVector4?(v.boundary=16,v.storage=16):_.isMatrix3?(v.boundary=48,v.storage=48):_.isMatrix4?(v.boundary=64,v.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),v}function m(_){const v=_.target;v.removeEventListener("dispose",m);const M=o.indexOf(v.__bindingPointIndex);o.splice(M,1),n.deleteBuffer(r[v.id]),delete r[v.id],delete s[v.id]}function u(){for(const _ in r)n.deleteBuffer(r[_]);o=[],r={},s={}}return{bind:l,update:c,dispose:u}}class B_{constructor(e={}){const{canvas:t=AE(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:f=!1}=e;this.isWebGLRenderer=!0;let h;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");h=i.getContextAttributes().alpha}else h=o;const p=new Uint32Array(4),g=new Int32Array(4);let y=null,m=null;const u=[],_=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=_n,this._useLegacyLights=!1,this.toneMapping=cr,this.toneMappingExposure=1;const v=this;let M=!1,A=0,b=0,T=null,N=-1,w=null;const S=new Ut,D=new Ut;let V=null;const I=new Ve(0);let G=0,B=t.width,J=t.height,Z=1,P=null,k=null;const z=new Ut(0,0,B,J),H=new Ut(0,0,B,J);let X=!1;const ue=new ih;let U=!1,ee=!1;const ie=new Qe,re=new O,Ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ue(){return T===null?Z:1}let F=i;function ye(R,W){return t.getContext(R,W)}try{const R={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:d,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${wc}`),t.addEventListener("webglcontextlost",E,!1),t.addEventListener("webglcontextrestored",j,!1),t.addEventListener("webglcontextcreationerror",Y,!1),F===null){const W="webgl2";if(F=ye(W,R),F===null)throw ye(W)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let ce,We,ve,be,Re,Ie,rt,L,C,$,ne,oe,ae,Ae,me,pe,De,fe,Te,Ze,Ce,xe,ke,Xe;function at(){ce=new V1(F),ce.init(),xe=new Eb(F,ce),We=new U1(F,ce,e,xe),ve=new Mb(F),be=new j1(F),Re=new ab,Ie=new Sb(F,ce,ve,Re,We,xe,be),rt=new O1(v),L=new B1(v),C=new ZE(F),ke=new I1(F,C),$=new H1(F,C,be,ke),ne=new X1(F,$,C,be),Te=new W1(F,We,Ie),pe=new F1(Re),oe=new ob(v,rt,L,ce,We,ke,pe),ae=new Nb(v,Re),Ae=new cb,me=new mb(ce),fe=new L1(v,rt,L,ve,ne,h,l),De=new yb(v,ne,We),Xe=new Lb(F,be,We,ve),Ze=new D1(F,ce,be),Ce=new G1(F,ce,be),be.programs=oe.programs,v.capabilities=We,v.extensions=ce,v.properties=Re,v.renderLists=Ae,v.shadowMap=De,v.state=ve,v.info=be}at();const He=new Rb(v,F);this.xr=He,this.getContext=function(){return F},this.getContextAttributes=function(){return F.getContextAttributes()},this.forceContextLoss=function(){const R=ce.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=ce.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return Z},this.setPixelRatio=function(R){R!==void 0&&(Z=R,this.setSize(B,J,!1))},this.getSize=function(R){return R.set(B,J)},this.setSize=function(R,W,Q=!0){if(He.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=R,J=W,t.width=Math.floor(R*Z),t.height=Math.floor(W*Z),Q===!0&&(t.style.width=R+"px",t.style.height=W+"px"),this.setViewport(0,0,R,W)},this.getDrawingBufferSize=function(R){return R.set(B*Z,J*Z).floor()},this.setDrawingBufferSize=function(R,W,Q){B=R,J=W,Z=Q,t.width=Math.floor(R*Q),t.height=Math.floor(W*Q),this.setViewport(0,0,R,W)},this.getCurrentViewport=function(R){return R.copy(S)},this.getViewport=function(R){return R.copy(z)},this.setViewport=function(R,W,Q,q){R.isVector4?z.set(R.x,R.y,R.z,R.w):z.set(R,W,Q,q),ve.viewport(S.copy(z).multiplyScalar(Z).round())},this.getScissor=function(R){return R.copy(H)},this.setScissor=function(R,W,Q,q){R.isVector4?H.set(R.x,R.y,R.z,R.w):H.set(R,W,Q,q),ve.scissor(D.copy(H).multiplyScalar(Z).round())},this.getScissorTest=function(){return X},this.setScissorTest=function(R){ve.setScissorTest(X=R)},this.setOpaqueSort=function(R){P=R},this.setTransparentSort=function(R){k=R},this.getClearColor=function(R){return R.copy(fe.getClearColor())},this.setClearColor=function(){fe.setClearColor.apply(fe,arguments)},this.getClearAlpha=function(){return fe.getClearAlpha()},this.setClearAlpha=function(){fe.setClearAlpha.apply(fe,arguments)},this.clear=function(R=!0,W=!0,Q=!0){let q=0;if(R){let K=!1;if(T!==null){const ge=T.texture.format;K=ge===S_||ge===M_||ge===y_}if(K){const ge=T.texture.type,Se=ge===pr||ge===Ks||ge===g_||ge===xa||ge===__||ge===x_,we=fe.getClearColor(),Pe=fe.getClearAlpha(),Fe=we.r,Ge=we.g,Ye=we.b;Se?(p[0]=Fe,p[1]=Ge,p[2]=Ye,p[3]=Pe,F.clearBufferuiv(F.COLOR,0,p)):(g[0]=Fe,g[1]=Ge,g[2]=Ye,g[3]=Pe,F.clearBufferiv(F.COLOR,0,g))}else q|=F.COLOR_BUFFER_BIT}W&&(q|=F.DEPTH_BUFFER_BIT),Q&&(q|=F.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",E,!1),t.removeEventListener("webglcontextrestored",j,!1),t.removeEventListener("webglcontextcreationerror",Y,!1),Ae.dispose(),me.dispose(),Re.dispose(),rt.dispose(),L.dispose(),ne.dispose(),ke.dispose(),Xe.dispose(),oe.dispose(),He.dispose(),He.removeEventListener("sessionstart",et),He.removeEventListener("sessionend",Et),ut.stop()};function E(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function j(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;const R=be.autoReset,W=De.enabled,Q=De.autoUpdate,q=De.needsUpdate,K=De.type;at(),be.autoReset=R,De.enabled=W,De.autoUpdate=Q,De.needsUpdate=q,De.type=K}function Y(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function se(R){const W=R.target;W.removeEventListener("dispose",se),de(W)}function de(R){ze(R),Re.remove(R)}function ze(R){const W=Re.get(R).programs;W!==void 0&&(W.forEach(function(Q){oe.releaseProgram(Q)}),R.isShaderMaterial&&oe.releaseShaderCache(R))}this.renderBufferDirect=function(R,W,Q,q,K,ge){W===null&&(W=Ne);const Se=K.isMesh&&K.matrixWorld.determinant()<0,we=q_(R,W,Q,q,K);ve.setMaterial(q,Se);let Pe=Q.index,Fe=1;if(q.wireframe===!0){if(Pe=$.getWireframeAttribute(Q),Pe===void 0)return;Fe=2}const Ge=Q.drawRange,Ye=Q.attributes.position;let wt=Ge.start*Fe,jt=(Ge.start+Ge.count)*Fe;ge!==null&&(wt=Math.max(wt,ge.start*Fe),jt=Math.min(jt,(ge.start+ge.count)*Fe)),Pe!==null?(wt=Math.max(wt,0),jt=Math.min(jt,Pe.count)):Ye!=null&&(wt=Math.max(wt,0),jt=Math.min(jt,Ye.count));const pn=jt-wt;if(pn<0||pn===1/0)return;ke.setup(K,q,we,Q,Pe);let fi,it=Ze;if(Pe!==null&&(fi=C.get(Pe),it=Ce,it.setIndex(fi)),K.isMesh)q.wireframe===!0?(ve.setLineWidth(q.wireframeLinewidth*Ue()),it.setMode(F.LINES)):it.setMode(F.TRIANGLES);else if(K.isLine){let Oe=q.linewidth;Oe===void 0&&(Oe=1),ve.setLineWidth(Oe*Ue()),K.isLineSegments?it.setMode(F.LINES):K.isLineLoop?it.setMode(F.LINE_LOOP):it.setMode(F.LINE_STRIP)}else K.isPoints?it.setMode(F.POINTS):K.isSprite&&it.setMode(F.TRIANGLES);if(K.isBatchedMesh)K._multiDrawInstances!==null?it.renderMultiDrawInstances(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount,K._multiDrawInstances):it.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else if(K.isInstancedMesh)it.renderInstances(wt,pn,K.count);else if(Q.isInstancedBufferGeometry){const Oe=Q._maxInstanceCount!==void 0?Q._maxInstanceCount:1/0,lo=Math.min(Q.instanceCount,Oe);it.renderInstances(wt,pn,lo)}else it.render(wt,pn)};function $e(R,W,Q){R.transparent===!0&&R.side===Un&&R.forceSinglePass===!1?(R.side=hn,R.needsUpdate=!0,Ma(R,W,Q),R.side=hr,R.needsUpdate=!0,Ma(R,W,Q),R.side=Un):Ma(R,W,Q)}this.compile=function(R,W,Q=null){Q===null&&(Q=R),m=me.get(Q),m.init(W),_.push(m),Q.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(m.pushLight(K),K.castShadow&&m.pushShadow(K))}),R!==Q&&R.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(m.pushLight(K),K.castShadow&&m.pushShadow(K))}),m.setupLights(v._useLegacyLights);const q=new Set;return R.traverse(function(K){const ge=K.material;if(ge)if(Array.isArray(ge))for(let Se=0;Se<ge.length;Se++){const we=ge[Se];$e(we,Q,K),q.add(we)}else $e(ge,Q,K),q.add(ge)}),_.pop(),m=null,q},this.compileAsync=function(R,W,Q=null){const q=this.compile(R,W,Q);return new Promise(K=>{function ge(){if(q.forEach(function(Se){Re.get(Se).currentProgram.isReady()&&q.delete(Se)}),q.size===0){K(R);return}setTimeout(ge,10)}ce.get("KHR_parallel_shader_compile")!==null?ge():setTimeout(ge,10)})};let mt=null;function Lt(R){mt&&mt(R)}function et(){ut.stop()}function Et(){ut.start()}const ut=new I_;ut.setAnimationLoop(Lt),typeof self<"u"&&ut.setContext(self),this.setAnimationLoop=function(R){mt=R,He.setAnimationLoop(R),R===null?ut.stop():ut.start()},He.addEventListener("sessionstart",et),He.addEventListener("sessionend",Et),this.render=function(R,W){if(W!==void 0&&W.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),He.enabled===!0&&He.isPresenting===!0&&(He.cameraAutoUpdate===!0&&He.updateCamera(W),W=He.getCamera()),R.isScene===!0&&R.onBeforeRender(v,R,W,T),m=me.get(R,_.length),m.init(W),_.push(m),ie.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),ue.setFromProjectionMatrix(ie),ee=this.localClippingEnabled,U=pe.init(this.clippingPlanes,ee),y=Ae.get(R,u.length),y.init(),u.push(y),Ii(R,W,0,v.sortObjects),y.finish(),v.sortObjects===!0&&y.sort(P,k);const Q=He.enabled===!1||He.isPresenting===!1||He.hasDepthSensing()===!1;Q&&fe.addToRenderList(y,R),this.info.render.frame++,U===!0&&pe.beginShadows();const q=m.state.shadowsArray;De.render(q,R,W),U===!0&&pe.endShadows(),this.info.autoReset===!0&&this.info.reset();const K=y.opaque,ge=y.transmissive;if(m.setupLights(v._useLegacyLights),W.isArrayCamera){const Se=W.cameras;if(ge.length>0)for(let we=0,Pe=Se.length;we<Pe;we++){const Fe=Se[we];Di(K,ge,R,Fe)}Q&&fe.render(R);for(let we=0,Pe=Se.length;we<Pe;we++){const Fe=Se[we];Cn(y,R,Fe,Fe.viewport)}}else ge.length>0&&Di(K,ge,R,W),Q&&fe.render(R),Cn(y,R,W);T!==null&&(Ie.updateMultisampleRenderTarget(T),Ie.updateRenderTargetMipmap(T)),R.isScene===!0&&R.onAfterRender(v,R,W),ke.resetDefaultState(),N=-1,w=null,_.pop(),_.length>0?(m=_[_.length-1],U===!0&&pe.setGlobalState(v.clippingPlanes,m.state.camera)):m=null,u.pop(),u.length>0?y=u[u.length-1]:y=null};function Ii(R,W,Q,q){if(R.visible===!1)return;if(R.layers.test(W.layers)){if(R.isGroup)Q=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(W);else if(R.isLight)m.pushLight(R),R.castShadow&&m.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||ue.intersectsSprite(R)){q&&re.setFromMatrixPosition(R.matrixWorld).applyMatrix4(ie);const Se=ne.update(R),we=R.material;we.visible&&y.push(R,Se,we,Q,re.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||ue.intersectsObject(R))){const Se=ne.update(R),we=R.material;if(q&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),re.copy(R.boundingSphere.center)):(Se.boundingSphere===null&&Se.computeBoundingSphere(),re.copy(Se.boundingSphere.center)),re.applyMatrix4(R.matrixWorld).applyMatrix4(ie)),Array.isArray(we)){const Pe=Se.groups;for(let Fe=0,Ge=Pe.length;Fe<Ge;Fe++){const Ye=Pe[Fe],wt=we[Ye.materialIndex];wt&&wt.visible&&y.push(R,Se,wt,Q,re.z,Ye)}}else we.visible&&y.push(R,Se,we,Q,re.z,null)}}const ge=R.children;for(let Se=0,we=ge.length;Se<we;Se++)Ii(ge[Se],W,Q,q)}function Cn(R,W,Q,q){const K=R.opaque,ge=R.transmissive,Se=R.transparent;m.setupLightsView(Q),U===!0&&pe.setGlobalState(v.clippingPlanes,Q),q&&ve.viewport(S.copy(q)),K.length>0&&di(K,W,Q),ge.length>0&&di(ge,W,Q),Se.length>0&&di(Se,W,Q),ve.buffers.depth.setTest(!0),ve.buffers.depth.setMask(!0),ve.buffers.color.setMask(!0),ve.setPolygonOffset(!1)}function Di(R,W,Q,q){if((Q.isScene===!0?Q.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[q.id]===void 0&&(m.state.transmissionRenderTarget[q.id]=new ei(1,1,{generateMipmaps:!0,type:ce.has("EXT_color_buffer_half_float")||ce.has("EXT_color_buffer_float")?ur:pr,minFilter:Ji,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1}));const ge=m.state.transmissionRenderTarget[q.id],Se=q.viewport||S;ge.setSize(Se.z,Se.w);const we=v.getRenderTarget();v.setRenderTarget(ge),v.getClearColor(I),G=v.getClearAlpha(),G<1&&v.setClearColor(16777215,.5),v.clear();const Pe=v.toneMapping;v.toneMapping=cr;const Fe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),m.setupLightsView(q),U===!0&&pe.setGlobalState(v.clippingPlanes,q),di(R,Q,q),Ie.updateMultisampleRenderTarget(ge),Ie.updateRenderTargetMipmap(ge),ce.has("WEBGL_multisampled_render_to_texture")===!1){let Ge=!1;for(let Ye=0,wt=W.length;Ye<wt;Ye++){const jt=W[Ye],pn=jt.object,fi=jt.geometry,it=jt.material,Oe=jt.group;if(it.side===Un&&pn.layers.test(q.layers)){const lo=it.side;it.side=hn,it.needsUpdate=!0,ao(pn,Q,q,fi,it,Oe),it.side=lo,it.needsUpdate=!0,Ge=!0}}Ge===!0&&(Ie.updateMultisampleRenderTarget(ge),Ie.updateRenderTargetMipmap(ge))}v.setRenderTarget(we),v.setClearColor(I,G),Fe!==void 0&&(q.viewport=Fe),v.toneMapping=Pe}function di(R,W,Q){const q=W.isScene===!0?W.overrideMaterial:null;for(let K=0,ge=R.length;K<ge;K++){const Se=R[K],we=Se.object,Pe=Se.geometry,Fe=q===null?Se.material:q,Ge=Se.group;we.layers.test(Q.layers)&&ao(we,W,Q,Pe,Fe,Ge)}}function ao(R,W,Q,q,K,ge){R.onBeforeRender(v,W,Q,q,K,ge),R.modelViewMatrix.multiplyMatrices(Q.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),K.onBeforeRender(v,W,Q,q,R,ge),K.transparent===!0&&K.side===Un&&K.forceSinglePass===!1?(K.side=hn,K.needsUpdate=!0,v.renderBufferDirect(Q,W,q,K,R,ge),K.side=hr,K.needsUpdate=!0,v.renderBufferDirect(Q,W,q,K,R,ge),K.side=Un):v.renderBufferDirect(Q,W,q,K,R,ge),R.onAfterRender(v,W,Q,q,K,ge)}function Ma(R,W,Q){W.isScene!==!0&&(W=Ne);const q=Re.get(R),K=m.state.lights,ge=m.state.shadowsArray,Se=K.state.version,we=oe.getParameters(R,K.state,ge,W,Q),Pe=oe.getProgramCacheKey(we);let Fe=q.programs;q.environment=R.isMeshStandardMaterial?W.environment:null,q.fog=W.fog,q.envMap=(R.isMeshStandardMaterial?L:rt).get(R.envMap||q.environment),q.envMapRotation=q.environment!==null&&R.envMap===null?W.environmentRotation:R.envMapRotation,Fe===void 0&&(R.addEventListener("dispose",se),Fe=new Map,q.programs=Fe);let Ge=Fe.get(Pe);if(Ge!==void 0){if(q.currentProgram===Ge&&q.lightsStateVersion===Se)return ph(R,we),Ge}else we.uniforms=oe.getUniforms(R),R.onBuild(Q,we,v),R.onBeforeCompile(we,v),Ge=oe.acquireProgram(we,Pe),Fe.set(Pe,Ge),q.uniforms=we.uniforms;const Ye=q.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ye.clippingPlanes=pe.uniform),ph(R,we),q.needsLights=Z_(R),q.lightsStateVersion=Se,q.needsLights&&(Ye.ambientLightColor.value=K.state.ambient,Ye.lightProbe.value=K.state.probe,Ye.directionalLights.value=K.state.directional,Ye.directionalLightShadows.value=K.state.directionalShadow,Ye.spotLights.value=K.state.spot,Ye.spotLightShadows.value=K.state.spotShadow,Ye.rectAreaLights.value=K.state.rectArea,Ye.ltc_1.value=K.state.rectAreaLTC1,Ye.ltc_2.value=K.state.rectAreaLTC2,Ye.pointLights.value=K.state.point,Ye.pointLightShadows.value=K.state.pointShadow,Ye.hemisphereLights.value=K.state.hemi,Ye.directionalShadowMap.value=K.state.directionalShadowMap,Ye.directionalShadowMatrix.value=K.state.directionalShadowMatrix,Ye.spotShadowMap.value=K.state.spotShadowMap,Ye.spotLightMatrix.value=K.state.spotLightMatrix,Ye.spotLightMap.value=K.state.spotLightMap,Ye.pointShadowMap.value=K.state.pointShadowMap,Ye.pointShadowMatrix.value=K.state.pointShadowMatrix),q.currentProgram=Ge,q.uniformsList=null,Ge}function hh(R){if(R.uniformsList===null){const W=R.currentProgram.getUniforms();R.uniformsList=El.seqWithValue(W.seq,R.uniforms)}return R.uniformsList}function ph(R,W){const Q=Re.get(R);Q.outputColorSpace=W.outputColorSpace,Q.batching=W.batching,Q.instancing=W.instancing,Q.instancingColor=W.instancingColor,Q.instancingMorph=W.instancingMorph,Q.skinning=W.skinning,Q.morphTargets=W.morphTargets,Q.morphNormals=W.morphNormals,Q.morphColors=W.morphColors,Q.morphTargetsCount=W.morphTargetsCount,Q.numClippingPlanes=W.numClippingPlanes,Q.numIntersection=W.numClipIntersection,Q.vertexAlphas=W.vertexAlphas,Q.vertexTangents=W.vertexTangents,Q.toneMapping=W.toneMapping}function q_(R,W,Q,q,K){W.isScene!==!0&&(W=Ne),Ie.resetTextureUnits();const ge=W.fog,Se=q.isMeshStandardMaterial?W.environment:null,we=T===null?v.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:xr,Pe=(q.isMeshStandardMaterial?L:rt).get(q.envMap||Se),Fe=q.vertexColors===!0&&!!Q.attributes.color&&Q.attributes.color.itemSize===4,Ge=!!Q.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Ye=!!Q.morphAttributes.position,wt=!!Q.morphAttributes.normal,jt=!!Q.morphAttributes.color;let pn=cr;q.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(pn=v.toneMapping);const fi=Q.morphAttributes.position||Q.morphAttributes.normal||Q.morphAttributes.color,it=fi!==void 0?fi.length:0,Oe=Re.get(q),lo=m.state.lights;if(U===!0&&(ee===!0||R!==w)){const Rn=R===w&&q.id===N;pe.setState(q,R,Rn)}let ht=!1;q.version===Oe.__version?(Oe.needsLights&&Oe.lightsStateVersion!==lo.state.version||Oe.outputColorSpace!==we||K.isBatchedMesh&&Oe.batching===!1||!K.isBatchedMesh&&Oe.batching===!0||K.isInstancedMesh&&Oe.instancing===!1||!K.isInstancedMesh&&Oe.instancing===!0||K.isSkinnedMesh&&Oe.skinning===!1||!K.isSkinnedMesh&&Oe.skinning===!0||K.isInstancedMesh&&Oe.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&Oe.instancingColor===!1&&K.instanceColor!==null||K.isInstancedMesh&&Oe.instancingMorph===!0&&K.morphTexture===null||K.isInstancedMesh&&Oe.instancingMorph===!1&&K.morphTexture!==null||Oe.envMap!==Pe||q.fog===!0&&Oe.fog!==ge||Oe.numClippingPlanes!==void 0&&(Oe.numClippingPlanes!==pe.numPlanes||Oe.numIntersection!==pe.numIntersection)||Oe.vertexAlphas!==Fe||Oe.vertexTangents!==Ge||Oe.morphTargets!==Ye||Oe.morphNormals!==wt||Oe.morphColors!==jt||Oe.toneMapping!==pn||Oe.morphTargetsCount!==it)&&(ht=!0):(ht=!0,Oe.__version=q.version);let yr=Oe.currentProgram;ht===!0&&(yr=Ma(q,W,K));let mh=!1,co=!1,Pc=!1;const Wt=yr.getUniforms(),Ui=Oe.uniforms;if(ve.useProgram(yr.program)&&(mh=!0,co=!0,Pc=!0),q.id!==N&&(N=q.id,co=!0),mh||w!==R){Wt.setValue(F,"projectionMatrix",R.projectionMatrix),Wt.setValue(F,"viewMatrix",R.matrixWorldInverse);const Rn=Wt.map.cameraPosition;Rn!==void 0&&Rn.setValue(F,re.setFromMatrixPosition(R.matrixWorld)),We.logarithmicDepthBuffer&&Wt.setValue(F,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&Wt.setValue(F,"isOrthographic",R.isOrthographicCamera===!0),w!==R&&(w=R,co=!0,Pc=!0)}if(K.isSkinnedMesh){Wt.setOptional(F,K,"bindMatrix"),Wt.setOptional(F,K,"bindMatrixInverse");const Rn=K.skeleton;Rn&&(Rn.boneTexture===null&&Rn.computeBoneTexture(),Wt.setValue(F,"boneTexture",Rn.boneTexture,Ie))}K.isBatchedMesh&&(Wt.setOptional(F,K,"batchingTexture"),Wt.setValue(F,"batchingTexture",K._matricesTexture,Ie));const Nc=Q.morphAttributes;if((Nc.position!==void 0||Nc.normal!==void 0||Nc.color!==void 0)&&Te.update(K,Q,yr),(co||Oe.receiveShadow!==K.receiveShadow)&&(Oe.receiveShadow=K.receiveShadow,Wt.setValue(F,"receiveShadow",K.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(Ui.envMap.value=Pe,Ui.flipEnvMap.value=Pe.isCubeTexture&&Pe.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&W.environment!==null&&(Ui.envMapIntensity.value=W.environmentIntensity),co&&(Wt.setValue(F,"toneMappingExposure",v.toneMappingExposure),Oe.needsLights&&K_(Ui,Pc),ge&&q.fog===!0&&ae.refreshFogUniforms(Ui,ge),ae.refreshMaterialUniforms(Ui,q,Z,J,m.state.transmissionRenderTarget[R.id]),El.upload(F,hh(Oe),Ui,Ie)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(El.upload(F,hh(Oe),Ui,Ie),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&Wt.setValue(F,"center",K.center),Wt.setValue(F,"modelViewMatrix",K.modelViewMatrix),Wt.setValue(F,"normalMatrix",K.normalMatrix),Wt.setValue(F,"modelMatrix",K.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const Rn=q.uniformsGroups;for(let Lc=0,J_=Rn.length;Lc<J_;Lc++){const gh=Rn[Lc];Xe.update(gh,yr),Xe.bind(gh,yr)}}return yr}function K_(R,W){R.ambientLightColor.needsUpdate=W,R.lightProbe.needsUpdate=W,R.directionalLights.needsUpdate=W,R.directionalLightShadows.needsUpdate=W,R.pointLights.needsUpdate=W,R.pointLightShadows.needsUpdate=W,R.spotLights.needsUpdate=W,R.spotLightShadows.needsUpdate=W,R.rectAreaLights.needsUpdate=W,R.hemisphereLights.needsUpdate=W}function Z_(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return A},this.getActiveMipmapLevel=function(){return b},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(R,W,Q){Re.get(R.texture).__webglTexture=W,Re.get(R.depthTexture).__webglTexture=Q;const q=Re.get(R);q.__hasExternalTextures=!0,q.__autoAllocateDepthBuffer=Q===void 0,q.__autoAllocateDepthBuffer||ce.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),q.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(R,W){const Q=Re.get(R);Q.__webglFramebuffer=W,Q.__useDefaultFramebuffer=W===void 0},this.setRenderTarget=function(R,W=0,Q=0){T=R,A=W,b=Q;let q=!0,K=null,ge=!1,Se=!1;if(R){const Pe=Re.get(R);Pe.__useDefaultFramebuffer!==void 0?(ve.bindFramebuffer(F.FRAMEBUFFER,null),q=!1):Pe.__webglFramebuffer===void 0?Ie.setupRenderTarget(R):Pe.__hasExternalTextures&&Ie.rebindTextures(R,Re.get(R.texture).__webglTexture,Re.get(R.depthTexture).__webglTexture);const Fe=R.texture;(Fe.isData3DTexture||Fe.isDataArrayTexture||Fe.isCompressedArrayTexture)&&(Se=!0);const Ge=Re.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Ge[W])?K=Ge[W][Q]:K=Ge[W],ge=!0):R.samples>0&&Ie.useMultisampledRTT(R)===!1?K=Re.get(R).__webglMultisampledFramebuffer:Array.isArray(Ge)?K=Ge[Q]:K=Ge,S.copy(R.viewport),D.copy(R.scissor),V=R.scissorTest}else S.copy(z).multiplyScalar(Z).floor(),D.copy(H).multiplyScalar(Z).floor(),V=X;if(ve.bindFramebuffer(F.FRAMEBUFFER,K)&&q&&ve.drawBuffers(R,K),ve.viewport(S),ve.scissor(D),ve.setScissorTest(V),ge){const Pe=Re.get(R.texture);F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_CUBE_MAP_POSITIVE_X+W,Pe.__webglTexture,Q)}else if(Se){const Pe=Re.get(R.texture),Fe=W||0;F.framebufferTextureLayer(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,Pe.__webglTexture,Q||0,Fe)}N=-1},this.readRenderTargetPixels=function(R,W,Q,q,K,ge,Se){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let we=Re.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Se!==void 0&&(we=we[Se]),we){ve.bindFramebuffer(F.FRAMEBUFFER,we);try{const Pe=R.texture,Fe=Pe.format,Ge=Pe.type;if(!We.textureFormatReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!We.textureTypeReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=R.width-q&&Q>=0&&Q<=R.height-K&&F.readPixels(W,Q,q,K,xe.convert(Fe),xe.convert(Ge),ge)}finally{const Pe=T!==null?Re.get(T).__webglFramebuffer:null;ve.bindFramebuffer(F.FRAMEBUFFER,Pe)}}},this.copyFramebufferToTexture=function(R,W,Q=0){const q=Math.pow(2,-Q),K=Math.floor(W.image.width*q),ge=Math.floor(W.image.height*q);Ie.setTexture2D(W,0),F.copyTexSubImage2D(F.TEXTURE_2D,Q,0,0,R.x,R.y,K,ge),ve.unbindTexture()},this.copyTextureToTexture=function(R,W,Q,q=0){const K=W.image.width,ge=W.image.height,Se=xe.convert(Q.format),we=xe.convert(Q.type);Ie.setTexture2D(Q,0),F.pixelStorei(F.UNPACK_FLIP_Y_WEBGL,Q.flipY),F.pixelStorei(F.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),F.pixelStorei(F.UNPACK_ALIGNMENT,Q.unpackAlignment),W.isDataTexture?F.texSubImage2D(F.TEXTURE_2D,q,R.x,R.y,K,ge,Se,we,W.image.data):W.isCompressedTexture?F.compressedTexSubImage2D(F.TEXTURE_2D,q,R.x,R.y,W.mipmaps[0].width,W.mipmaps[0].height,Se,W.mipmaps[0].data):F.texSubImage2D(F.TEXTURE_2D,q,R.x,R.y,Se,we,W.image),q===0&&Q.generateMipmaps&&F.generateMipmap(F.TEXTURE_2D),ve.unbindTexture()},this.copyTextureToTexture3D=function(R,W,Q,q,K=0){const ge=R.max.x-R.min.x,Se=R.max.y-R.min.y,we=R.max.z-R.min.z,Pe=xe.convert(q.format),Fe=xe.convert(q.type);let Ge;if(q.isData3DTexture)Ie.setTexture3D(q,0),Ge=F.TEXTURE_3D;else if(q.isDataArrayTexture||q.isCompressedArrayTexture)Ie.setTexture2DArray(q,0),Ge=F.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}F.pixelStorei(F.UNPACK_FLIP_Y_WEBGL,q.flipY),F.pixelStorei(F.UNPACK_PREMULTIPLY_ALPHA_WEBGL,q.premultiplyAlpha),F.pixelStorei(F.UNPACK_ALIGNMENT,q.unpackAlignment);const Ye=F.getParameter(F.UNPACK_ROW_LENGTH),wt=F.getParameter(F.UNPACK_IMAGE_HEIGHT),jt=F.getParameter(F.UNPACK_SKIP_PIXELS),pn=F.getParameter(F.UNPACK_SKIP_ROWS),fi=F.getParameter(F.UNPACK_SKIP_IMAGES),it=Q.isCompressedTexture?Q.mipmaps[K]:Q.image;F.pixelStorei(F.UNPACK_ROW_LENGTH,it.width),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,it.height),F.pixelStorei(F.UNPACK_SKIP_PIXELS,R.min.x),F.pixelStorei(F.UNPACK_SKIP_ROWS,R.min.y),F.pixelStorei(F.UNPACK_SKIP_IMAGES,R.min.z),Q.isDataTexture||Q.isData3DTexture?F.texSubImage3D(Ge,K,W.x,W.y,W.z,ge,Se,we,Pe,Fe,it.data):q.isCompressedArrayTexture?F.compressedTexSubImage3D(Ge,K,W.x,W.y,W.z,ge,Se,we,Pe,it.data):F.texSubImage3D(Ge,K,W.x,W.y,W.z,ge,Se,we,Pe,Fe,it),F.pixelStorei(F.UNPACK_ROW_LENGTH,Ye),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,wt),F.pixelStorei(F.UNPACK_SKIP_PIXELS,jt),F.pixelStorei(F.UNPACK_SKIP_ROWS,pn),F.pixelStorei(F.UNPACK_SKIP_IMAGES,fi),K===0&&q.generateMipmaps&&F.generateMipmap(Ge),ve.unbindTexture()},this.initTexture=function(R){R.isCubeTexture?Ie.setTextureCube(R,0):R.isData3DTexture?Ie.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?Ie.setTexture2DArray(R,0):Ie.setTexture2D(R,0),ve.unbindTexture()},this.resetState=function(){A=0,b=0,T=null,ve.reset(),ke.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ti}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===Zf?"display-p3":"srgb",t.unpackColorSpace=st.workingColorSpace===Ac?"display-p3":"srgb"}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class rc extends Ot{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ui,this.environmentIntensity=1,this.environmentRotation=new ui,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Fu extends Qt{constructor(e,t,i,r,s,o,a,l,c,d,f,h){super(null,o,a,l,c,d,r,s,f,h),this.isCompressedTexture=!0,this.image={width:t,height:i},this.mipmaps=e,this.flipY=!1,this.generateMipmaps=!1}}class Ib extends Qt{constructor(e,t,i,r,s,o,a,l,c){super(e,t,i,r,s,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class oh extends ni{constructor(e=1,t=1,i=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const d=[],f=[],h=[],p=[];let g=0;const y=[],m=i/2;let u=0;_(),o===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(d),this.setAttribute("position",new kt(f,3)),this.setAttribute("normal",new kt(h,3)),this.setAttribute("uv",new kt(p,2));function _(){const M=new O,A=new O;let b=0;const T=(t-e)/i;for(let N=0;N<=s;N++){const w=[],S=N/s,D=S*(t-e)+e;for(let V=0;V<=r;V++){const I=V/r,G=I*l+a,B=Math.sin(G),J=Math.cos(G);A.x=D*B,A.y=-S*i+m,A.z=D*J,f.push(A.x,A.y,A.z),M.set(B,T,J).normalize(),h.push(M.x,M.y,M.z),p.push(I,1-S),w.push(g++)}y.push(w)}for(let N=0;N<r;N++)for(let w=0;w<s;w++){const S=y[w][N],D=y[w+1][N],V=y[w+1][N+1],I=y[w][N+1];d.push(S,D,I),d.push(D,V,I),b+=6}c.addGroup(u,b,0),u+=b}function v(M){const A=g,b=new Me,T=new O;let N=0;const w=M===!0?e:t,S=M===!0?1:-1;for(let V=1;V<=r;V++)f.push(0,m*S,0),h.push(0,S,0),p.push(.5,.5),g++;const D=g;for(let V=0;V<=r;V++){const G=V/r*l+a,B=Math.cos(G),J=Math.sin(G);T.x=w*J,T.y=m*S,T.z=w*B,f.push(T.x,T.y,T.z),h.push(0,S,0),b.x=B*.5+.5,b.y=J*.5*S+.5,p.push(b.x,b.y),g++}for(let V=0;V<r;V++){const I=A+V,G=D+V;M===!0?d.push(G,G+1,I):d.push(G+1,G,I),N+=3}c.addGroup(u,N,M===!0?1:2),u+=N}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new oh(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Rc extends ni{constructor(e=1,t=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(o+a,Math.PI);let c=0;const d=[],f=new O,h=new O,p=[],g=[],y=[],m=[];for(let u=0;u<=i;u++){const _=[],v=u/i;let M=0;u===0&&o===0?M=.5/t:u===i&&l===Math.PI&&(M=-.5/t);for(let A=0;A<=t;A++){const b=A/t;f.x=-e*Math.cos(r+b*s)*Math.sin(o+v*a),f.y=e*Math.cos(o+v*a),f.z=e*Math.sin(r+b*s)*Math.sin(o+v*a),g.push(f.x,f.y,f.z),h.copy(f).normalize(),y.push(h.x,h.y,h.z),m.push(b+M,1-v),_.push(c++)}d.push(_)}for(let u=0;u<i;u++)for(let _=0;_<t;_++){const v=d[u][_+1],M=d[u][_],A=d[u+1][_],b=d[u+1][_+1];(u!==0||o>0)&&p.push(v,M,b),(u!==i-1||l<Math.PI)&&p.push(M,A,b)}this.setIndex(p),this.setAttribute("position",new kt(g,3)),this.setAttribute("normal",new kt(y,3)),this.setAttribute("uv",new kt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rc(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class ah extends ni{constructor(e=1,t=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);const o=[],a=[],l=[],c=[],d=new O,f=new O,h=new O;for(let p=0;p<=i;p++)for(let g=0;g<=r;g++){const y=g/r*s,m=p/i*Math.PI*2;f.x=(e+t*Math.cos(m))*Math.cos(y),f.y=(e+t*Math.cos(m))*Math.sin(y),f.z=t*Math.sin(m),a.push(f.x,f.y,f.z),d.x=e*Math.cos(y),d.y=e*Math.sin(y),h.subVectors(f,d).normalize(),l.push(h.x,h.y,h.z),c.push(g/r),c.push(p/i)}for(let p=1;p<=i;p++)for(let g=1;g<=r;g++){const y=(r+1)*p+g-1,m=(r+1)*(p-1)+g-1,u=(r+1)*(p-1)+g,_=(r+1)*p+g;o.push(y,m,_),o.push(m,u,_)}this.setIndex(o),this.setAttribute("position",new kt(a,3)),this.setAttribute("normal",new kt(l,3)),this.setAttribute("uv",new kt(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ah(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Db extends Vt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Xn extends ya{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ve(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ve(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=E_,this.normalScale=new Me(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ui,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class V_ extends Ot{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ve(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}const Ou=new Qe,tg=new O,ng=new O;class Ub{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Me(512,512),this.map=null,this.mapPass=null,this.matrix=new Qe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ih,this._frameExtents=new Me(1,1),this._viewportCount=1,this._viewports=[new Ut(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;tg.setFromMatrixPosition(e.matrixWorld),t.position.copy(tg),ng.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(ng),t.updateMatrixWorld(),Ou.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ou),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ou)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Fb extends Ub{constructor(){super(new rh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class ku extends V_{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ot.DEFAULT_UP),this.updateMatrix(),this.target=new Ot,this.shadow=new Fb}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Ob extends V_{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class kb{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=ig(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=ig();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function ig(){return(typeof performance>"u"?Date:performance).now()}const lh="\\[\\]\\.:\\/",zb=new RegExp("["+lh+"]","g"),ch="[^"+lh+"]",Bb="[^"+lh.replace("\\.","")+"]",Vb=/((?:WC+[\/:])*)/.source.replace("WC",ch),Hb=/(WCOD+)?/.source.replace("WCOD",Bb),Gb=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",ch),jb=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",ch),Wb=new RegExp("^"+Vb+Hb+Gb+jb+"$"),Xb=["material","materials","bones","map"];class $b{constructor(e,t,i){const r=i||tt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();const i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,t)}setValue(e,t){const i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}}class tt{constructor(e,t,i){this.path=t,this.parsedPath=i||tt.parseTrackName(t),this.node=tt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new tt.Composite(e,t,i):new tt(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(zb,"")}static parseTrackName(e){const t=Wb.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=i.nodeName.substring(r+1);Xb.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){const i=function(s){for(let o=0;o<s.length;o++){const a=s[o];if(a.name===t||a.uuid===t)return a;const l=i(a.children);if(l)return l}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[t++]=i[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,i=t.objectName,r=t.propertyName;let s=t.propertyIndex;if(e||(e=tt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let d=0;d<e.length;d++)if(e[d].name===c){c=d;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const o=e[r];if(o===void 0){const c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}tt.Composite=$b;tt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};tt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};tt.prototype.GetterByBindingType=[tt.prototype._getValue_direct,tt.prototype._getValue_array,tt.prototype._getValue_arrayElement,tt.prototype._getValue_toArray];tt.prototype.SetterByBindingTypeAndVersioning=[[tt.prototype._setValue_direct,tt.prototype._setValue_direct_setNeedsUpdate,tt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_array,tt.prototype._setValue_array_setNeedsUpdate,tt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_arrayElement,tt.prototype._setValue_arrayElement_setNeedsUpdate,tt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_fromArray,tt.prototype._setValue_fromArray_setNeedsUpdate,tt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class uh{constructor(e){this.value=e}clone(){return new uh(this.value.clone===void 0?this.value:this.value.clone())}}const rg=new Qe;class H_{constructor(e,t,i=0,r=1/0){this.ray=new th(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new nh,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return rg.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(rg),this}intersectObject(e,t=!0,i=[]){return Jd(e,this,i,t),i.sort(sg),i}intersectObjects(e,t=!0,i=[]){for(let r=0,s=e.length;r<s;r++)Jd(e[r],this,i,t);return i.sort(sg),i}}function sg(n,e){return n.distance-e.distance}function Jd(n,e,t,i){if(n.layers.test(e.layers)&&n.raycast(e,t),i===!0){const r=n.children;for(let s=0,o=r.length;s<o;s++)Jd(r[s],e,t,!0)}}class sc{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Zt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:wc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=wc);const og={type:"change"},zu={type:"start"},ag={type:"end"},ol=new th,lg=new Xi,Yb=Math.cos(70*Zs.DEG2RAD);class qb extends Wr{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new O,this.cursor=new O,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Rr.ROTATE,MIDDLE:Rr.DOLLY,RIGHT:Rr.PAN},this.touches={ONE:Yr.ROTATE,TWO:Yr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return a.phi},this.getAzimuthalAngle=function(){return a.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(E){E.addEventListener("keydown",De),this._domElementKeyEvents=E},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",De),this._domElementKeyEvents=null},this.saveState=function(){i.target0.copy(i.target),i.position0.copy(i.object.position),i.zoom0=i.object.zoom},this.reset=function(){i.target.copy(i.target0),i.object.position.copy(i.position0),i.object.zoom=i.zoom0,i.object.updateProjectionMatrix(),i.dispatchEvent(og),i.update(),s=r.NONE},this.update=function(){const E=new O,j=new Jt().setFromUnitVectors(e.up,new O(0,1,0)),Y=j.clone().invert(),se=new O,de=new Jt,ze=new O,$e=2*Math.PI;return function(Lt=null){const et=i.object.position;E.copy(et).sub(i.target),E.applyQuaternion(j),a.setFromVector3(E),i.autoRotate&&s===r.NONE&&V(S(Lt)),i.enableDamping?(a.theta+=l.theta*i.dampingFactor,a.phi+=l.phi*i.dampingFactor):(a.theta+=l.theta,a.phi+=l.phi);let Et=i.minAzimuthAngle,ut=i.maxAzimuthAngle;isFinite(Et)&&isFinite(ut)&&(Et<-Math.PI?Et+=$e:Et>Math.PI&&(Et-=$e),ut<-Math.PI?ut+=$e:ut>Math.PI&&(ut-=$e),Et<=ut?a.theta=Math.max(Et,Math.min(ut,a.theta)):a.theta=a.theta>(Et+ut)/2?Math.max(Et,a.theta):Math.min(ut,a.theta)),a.phi=Math.max(i.minPolarAngle,Math.min(i.maxPolarAngle,a.phi)),a.makeSafe(),i.enableDamping===!0?i.target.addScaledVector(d,i.dampingFactor):i.target.add(d),i.target.sub(i.cursor),i.target.clampLength(i.minTargetRadius,i.maxTargetRadius),i.target.add(i.cursor);let Ii=!1;if(i.zoomToCursor&&b||i.object.isOrthographicCamera)a.radius=z(a.radius);else{const Cn=a.radius;a.radius=z(a.radius*c),Ii=Cn!=a.radius}if(E.setFromSpherical(a),E.applyQuaternion(Y),et.copy(i.target).add(E),i.object.lookAt(i.target),i.enableDamping===!0?(l.theta*=1-i.dampingFactor,l.phi*=1-i.dampingFactor,d.multiplyScalar(1-i.dampingFactor)):(l.set(0,0,0),d.set(0,0,0)),i.zoomToCursor&&b){let Cn=null;if(i.object.isPerspectiveCamera){const Di=E.length();Cn=z(Di*c);const di=Di-Cn;i.object.position.addScaledVector(M,di),i.object.updateMatrixWorld(),Ii=!!di}else if(i.object.isOrthographicCamera){const Di=new O(A.x,A.y,0);Di.unproject(i.object);const di=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),i.object.updateProjectionMatrix(),Ii=di!==i.object.zoom;const ao=new O(A.x,A.y,0);ao.unproject(i.object),i.object.position.sub(ao).add(Di),i.object.updateMatrixWorld(),Cn=E.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),i.zoomToCursor=!1;Cn!==null&&(this.screenSpacePanning?i.target.set(0,0,-1).transformDirection(i.object.matrix).multiplyScalar(Cn).add(i.object.position):(ol.origin.copy(i.object.position),ol.direction.set(0,0,-1).transformDirection(i.object.matrix),Math.abs(i.object.up.dot(ol.direction))<Yb?e.lookAt(i.target):(lg.setFromNormalAndCoplanarPoint(i.object.up,i.target),ol.intersectPlane(lg,i.target))))}else if(i.object.isOrthographicCamera){const Cn=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),Cn!==i.object.zoom&&(i.object.updateProjectionMatrix(),Ii=!0)}return c=1,b=!1,Ii||se.distanceToSquared(i.object.position)>o||8*(1-de.dot(i.object.quaternion))>o||ze.distanceToSquared(i.target)>o?(i.dispatchEvent(og),se.copy(i.object.position),de.copy(i.object.quaternion),ze.copy(i.target),!0):!1}}(),this.dispose=function(){i.domElement.removeEventListener("contextmenu",Ze),i.domElement.removeEventListener("pointerdown",L),i.domElement.removeEventListener("pointercancel",$),i.domElement.removeEventListener("wheel",ae),i.domElement.removeEventListener("pointermove",C),i.domElement.removeEventListener("pointerup",$),i.domElement.getRootNode().removeEventListener("keydown",me,{capture:!0}),i._domElementKeyEvents!==null&&(i._domElementKeyEvents.removeEventListener("keydown",De),i._domElementKeyEvents=null)};const i=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let s=r.NONE;const o=1e-6,a=new sc,l=new sc;let c=1;const d=new O,f=new Me,h=new Me,p=new Me,g=new Me,y=new Me,m=new Me,u=new Me,_=new Me,v=new Me,M=new O,A=new Me;let b=!1;const T=[],N={};let w=!1;function S(E){return E!==null?2*Math.PI/60*i.autoRotateSpeed*E:2*Math.PI/60/60*i.autoRotateSpeed}function D(E){const j=Math.abs(E*.01);return Math.pow(.95,i.zoomSpeed*j)}function V(E){l.theta-=E}function I(E){l.phi-=E}const G=function(){const E=new O;return function(Y,se){E.setFromMatrixColumn(se,0),E.multiplyScalar(-Y),d.add(E)}}(),B=function(){const E=new O;return function(Y,se){i.screenSpacePanning===!0?E.setFromMatrixColumn(se,1):(E.setFromMatrixColumn(se,0),E.crossVectors(i.object.up,E)),E.multiplyScalar(Y),d.add(E)}}(),J=function(){const E=new O;return function(Y,se){const de=i.domElement;if(i.object.isPerspectiveCamera){const ze=i.object.position;E.copy(ze).sub(i.target);let $e=E.length();$e*=Math.tan(i.object.fov/2*Math.PI/180),G(2*Y*$e/de.clientHeight,i.object.matrix),B(2*se*$e/de.clientHeight,i.object.matrix)}else i.object.isOrthographicCamera?(G(Y*(i.object.right-i.object.left)/i.object.zoom/de.clientWidth,i.object.matrix),B(se*(i.object.top-i.object.bottom)/i.object.zoom/de.clientHeight,i.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),i.enablePan=!1)}}();function Z(E){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c/=E:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function P(E){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c*=E:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function k(E,j){if(!i.zoomToCursor)return;b=!0;const Y=i.domElement.getBoundingClientRect(),se=E-Y.left,de=j-Y.top,ze=Y.width,$e=Y.height;A.x=se/ze*2-1,A.y=-(de/$e)*2+1,M.set(A.x,A.y,1).unproject(i.object).sub(i.object.position).normalize()}function z(E){return Math.max(i.minDistance,Math.min(i.maxDistance,E))}function H(E){f.set(E.clientX,E.clientY)}function X(E){k(E.clientX,E.clientX),u.set(E.clientX,E.clientY)}function ue(E){g.set(E.clientX,E.clientY)}function U(E){h.set(E.clientX,E.clientY),p.subVectors(h,f).multiplyScalar(i.rotateSpeed);const j=i.domElement;V(2*Math.PI*p.x/j.clientHeight),I(2*Math.PI*p.y/j.clientHeight),f.copy(h),i.update()}function ee(E){_.set(E.clientX,E.clientY),v.subVectors(_,u),v.y>0?Z(D(v.y)):v.y<0&&P(D(v.y)),u.copy(_),i.update()}function ie(E){y.set(E.clientX,E.clientY),m.subVectors(y,g).multiplyScalar(i.panSpeed),J(m.x,m.y),g.copy(y),i.update()}function re(E){k(E.clientX,E.clientY),E.deltaY<0?P(D(E.deltaY)):E.deltaY>0&&Z(D(E.deltaY)),i.update()}function Ne(E){let j=!1;switch(E.code){case i.keys.UP:E.ctrlKey||E.metaKey||E.shiftKey?I(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):J(0,i.keyPanSpeed),j=!0;break;case i.keys.BOTTOM:E.ctrlKey||E.metaKey||E.shiftKey?I(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):J(0,-i.keyPanSpeed),j=!0;break;case i.keys.LEFT:E.ctrlKey||E.metaKey||E.shiftKey?V(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):J(i.keyPanSpeed,0),j=!0;break;case i.keys.RIGHT:E.ctrlKey||E.metaKey||E.shiftKey?V(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):J(-i.keyPanSpeed,0),j=!0;break}j&&(E.preventDefault(),i.update())}function Ue(E){if(T.length===1)f.set(E.pageX,E.pageY);else{const j=at(E),Y=.5*(E.pageX+j.x),se=.5*(E.pageY+j.y);f.set(Y,se)}}function F(E){if(T.length===1)g.set(E.pageX,E.pageY);else{const j=at(E),Y=.5*(E.pageX+j.x),se=.5*(E.pageY+j.y);g.set(Y,se)}}function ye(E){const j=at(E),Y=E.pageX-j.x,se=E.pageY-j.y,de=Math.sqrt(Y*Y+se*se);u.set(0,de)}function ce(E){i.enableZoom&&ye(E),i.enablePan&&F(E)}function We(E){i.enableZoom&&ye(E),i.enableRotate&&Ue(E)}function ve(E){if(T.length==1)h.set(E.pageX,E.pageY);else{const Y=at(E),se=.5*(E.pageX+Y.x),de=.5*(E.pageY+Y.y);h.set(se,de)}p.subVectors(h,f).multiplyScalar(i.rotateSpeed);const j=i.domElement;V(2*Math.PI*p.x/j.clientHeight),I(2*Math.PI*p.y/j.clientHeight),f.copy(h)}function be(E){if(T.length===1)y.set(E.pageX,E.pageY);else{const j=at(E),Y=.5*(E.pageX+j.x),se=.5*(E.pageY+j.y);y.set(Y,se)}m.subVectors(y,g).multiplyScalar(i.panSpeed),J(m.x,m.y),g.copy(y)}function Re(E){const j=at(E),Y=E.pageX-j.x,se=E.pageY-j.y,de=Math.sqrt(Y*Y+se*se);_.set(0,de),v.set(0,Math.pow(_.y/u.y,i.zoomSpeed)),Z(v.y),u.copy(_);const ze=(E.pageX+j.x)*.5,$e=(E.pageY+j.y)*.5;k(ze,$e)}function Ie(E){i.enableZoom&&Re(E),i.enablePan&&be(E)}function rt(E){i.enableZoom&&Re(E),i.enableRotate&&ve(E)}function L(E){i.enabled!==!1&&(T.length===0&&(i.domElement.setPointerCapture(E.pointerId),i.domElement.addEventListener("pointermove",C),i.domElement.addEventListener("pointerup",$)),!ke(E)&&(Ce(E),E.pointerType==="touch"?fe(E):ne(E)))}function C(E){i.enabled!==!1&&(E.pointerType==="touch"?Te(E):oe(E))}function $(E){switch(xe(E),T.length){case 0:i.domElement.releasePointerCapture(E.pointerId),i.domElement.removeEventListener("pointermove",C),i.domElement.removeEventListener("pointerup",$),i.dispatchEvent(ag),s=r.NONE;break;case 1:const j=T[0],Y=N[j];fe({pointerId:j,pageX:Y.x,pageY:Y.y});break}}function ne(E){let j;switch(E.button){case 0:j=i.mouseButtons.LEFT;break;case 1:j=i.mouseButtons.MIDDLE;break;case 2:j=i.mouseButtons.RIGHT;break;default:j=-1}switch(j){case Rr.DOLLY:if(i.enableZoom===!1)return;X(E),s=r.DOLLY;break;case Rr.ROTATE:if(E.ctrlKey||E.metaKey||E.shiftKey){if(i.enablePan===!1)return;ue(E),s=r.PAN}else{if(i.enableRotate===!1)return;H(E),s=r.ROTATE}break;case Rr.PAN:if(E.ctrlKey||E.metaKey||E.shiftKey){if(i.enableRotate===!1)return;H(E),s=r.ROTATE}else{if(i.enablePan===!1)return;ue(E),s=r.PAN}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(zu)}function oe(E){switch(s){case r.ROTATE:if(i.enableRotate===!1)return;U(E);break;case r.DOLLY:if(i.enableZoom===!1)return;ee(E);break;case r.PAN:if(i.enablePan===!1)return;ie(E);break}}function ae(E){i.enabled===!1||i.enableZoom===!1||s!==r.NONE||(E.preventDefault(),i.dispatchEvent(zu),re(Ae(E)),i.dispatchEvent(ag))}function Ae(E){const j=E.deltaMode,Y={clientX:E.clientX,clientY:E.clientY,deltaY:E.deltaY};switch(j){case 1:Y.deltaY*=16;break;case 2:Y.deltaY*=100;break}return E.ctrlKey&&!w&&(Y.deltaY*=10),Y}function me(E){E.key==="Control"&&(w=!0,i.domElement.getRootNode().addEventListener("keyup",pe,{passive:!0,capture:!0}))}function pe(E){E.key==="Control"&&(w=!1,i.domElement.getRootNode().removeEventListener("keyup",pe,{passive:!0,capture:!0}))}function De(E){i.enabled===!1||i.enablePan===!1||Ne(E)}function fe(E){switch(Xe(E),T.length){case 1:switch(i.touches.ONE){case Yr.ROTATE:if(i.enableRotate===!1)return;Ue(E),s=r.TOUCH_ROTATE;break;case Yr.PAN:if(i.enablePan===!1)return;F(E),s=r.TOUCH_PAN;break;default:s=r.NONE}break;case 2:switch(i.touches.TWO){case Yr.DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;ce(E),s=r.TOUCH_DOLLY_PAN;break;case Yr.DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;We(E),s=r.TOUCH_DOLLY_ROTATE;break;default:s=r.NONE}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(zu)}function Te(E){switch(Xe(E),s){case r.TOUCH_ROTATE:if(i.enableRotate===!1)return;ve(E),i.update();break;case r.TOUCH_PAN:if(i.enablePan===!1)return;be(E),i.update();break;case r.TOUCH_DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;Ie(E),i.update();break;case r.TOUCH_DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;rt(E),i.update();break;default:s=r.NONE}}function Ze(E){i.enabled!==!1&&E.preventDefault()}function Ce(E){T.push(E.pointerId)}function xe(E){delete N[E.pointerId];for(let j=0;j<T.length;j++)if(T[j]==E.pointerId){T.splice(j,1);return}}function ke(E){for(let j=0;j<T.length;j++)if(T[j]==E.pointerId)return!0;return!1}function Xe(E){let j=N[E.pointerId];j===void 0&&(j=new Me,N[E.pointerId]=j),j.set(E.pageX,E.pageY)}function at(E){const j=E.pointerId===T[0]?T[1]:T[0];return N[j]}i.domElement.addEventListener("contextmenu",Ze),i.domElement.addEventListener("pointerdown",L),i.domElement.addEventListener("pointercancel",$),i.domElement.addEventListener("wheel",ae,{passive:!1}),i.domElement.getRootNode().addEventListener("keydown",me,{passive:!0,capture:!0}),this.update()}}const G_={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class oo{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Kb=new rh(-1,1,1,-1,0,1);class Zb extends ni{constructor(){super(),this.setAttribute("position",new kt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new kt([0,2,0,0,2,0],2))}}const Jb=new Zb;class dh{constructor(e){this._mesh=new At(Jb,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Kb)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Qb extends oo{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof Vt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=fa.clone(e.uniforms),this.material=new Vt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new dh(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class cg extends oo{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class eC extends oo{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class tC{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new Me);this._width=i.width,this._height=i.height,t=new ei(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ur}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Qb(G_),this.copyPass.material.blending=bi,this.clock=new kb}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let r=0,s=this.passes.length;r<s;r++){const o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}cg!==void 0&&(o instanceof cg?i=!0:o instanceof eC&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Me);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class nC extends oo{constructor(e,t,i=null,r=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ve}render(e,t,i){const r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}}const iC={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ve(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class Qs extends oo{constructor(e,t,i,r){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new Me(e.x,e.y):new Me(256,256),this.clearColor=new Ve(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new ei(s,o,{type:ur}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let f=0;f<this.nMips;f++){const h=new ei(s,o,{type:ur});h.texture.name="UnrealBloomPass.h"+f,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);const p=new ei(s,o,{type:ur});p.texture.name="UnrealBloomPass.v"+f,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),s=Math.round(s/2),o=Math.round(o/2)}const a=iC;this.highPassUniforms=fa.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Vt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let f=0;f<this.nMips;f++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[f])),this.separableBlurMaterials[f].uniforms.invSize.value=new Me(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const d=G_;this.copyUniforms=fa.clone(d.uniforms),this.blendMaterial=new Vt({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:Xd,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ve,this.oldClearAlpha=1,this.basic=new bc,this.fsQuad=new dh(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new Me(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=Qs.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Qs.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),a=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Vt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Me(.5,.5)},direction:{value:new Me(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new Vt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}Qs.BlurDirectionX=new Me(1,0);Qs.BlurDirectionY=new Me(0,1);const rC={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class sC extends oo{constructor(){super();const e=rC;this.uniforms=fa.clone(e.uniforms),this.material=new Db({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new dh(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},st.getTransfer(this._outputColorSpace)===lt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===c_?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===u_?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===d_?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Kf?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===f_?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===h_&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class oC{constructor(e){this.canvas=e,this._init()}_init(){const e=this.canvas,t=e.clientWidth,i=e.clientHeight;this.renderer=new B_({canvas:e,antialias:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.setSize(t,i,!1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=a_,this.renderer.toneMapping=Kf,this.renderer.toneMappingExposure=.95,this.renderer.outputColorSpace=_n,this.scene=new rc,this.scene.background=new Ve(16052974),this.scene.fog=null,this.camera=new xn(52,t/i,.1,100),this.camera.position.set(3,4,10),this.camera.lookAt(3,0,0);const r=new Ob(13162736,1.5);this.scene.add(r);const s=new ku(16777215,2.8);s.position.set(5,12,7),s.castShadow=!0,s.shadow.mapSize.width=2048,s.shadow.mapSize.height=2048,s.shadow.camera.near=.5,s.shadow.camera.far=50,s.shadow.camera.left=-10,s.shadow.camera.right=10,s.shadow.camera.top=10,s.shadow.camera.bottom=-10,s.shadow.bias=-4e-4,this.scene.add(s);const o=new ku(11585776,.8);o.position.set(-5,4,-3),this.scene.add(o);const a=new ku(15266047,.5);a.position.set(0,-3,-8),this.scene.add(a),this._buildGround(),this.controls=new qb(this.camera,e),this.controls.enableDamping=!0,this.controls.dampingFactor=.07,this.controls.minDistance=3,this.controls.maxDistance=25,this.controls.maxPolarAngle=Math.PI*.48,this.controls.enablePan=!0,this.controls.screenSpacePanning=!0,this.controls.mouseButtons.MIDDLE=Rr.PAN,this.controls.target.set(3,0,0),this._buildPostProcessing(t,i),this._resizeObserver=new ResizeObserver(()=>this._onResize()),this._resizeObserver.observe(e.parentElement),Ee.camera=this.camera,Ee.animateTo=(l,c,d)=>this.animateCameraTo(l,c,d),Ee.fitCamera=()=>this.fitCamera(),Ee.orbitDelta=(l,c)=>{const d=this.controls.target.clone(),f=this.camera.position.clone().sub(d),h=new sc().setFromVector3(f);h.theta-=l*.008,h.phi=Math.max(.05,Math.min(Math.PI*.47,h.phi-c*.006)),f.setFromSpherical(h),this.camera.position.copy(d).add(f),this.controls.target.copy(d),this.controls.update()},requestAnimationFrame(()=>this._onResize())}_buildGround(){const t=new mr(1e3,1e3),i=new Xn({color:13814978,roughness:.95,metalness:0,transparent:!0,opacity:.13,depthWrite:!1}),r=new At(t,i);r.rotation.x=-Math.PI/2,r.position.y=-3.2,r.receiveShadow=!0,this.scene.add(r),this.ground=r;const s=new mr(4e3,4e3),o=new Vt({transparent:!0,depthWrite:!1,side:Un,uniforms:{uCell:{value:1},uMajor:{value:10},uColor:{value:new Ve(10992082)},uColorMajor:{value:new Ve(8690104)},uCenter:{value:new O},uFade:{value:60}},vertexShader:`
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,fragmentShader:`
        precision highp float;
        varying vec3 vWorld;
        uniform float uCell;
        uniform float uMajor;
        uniform vec3  uColor;
        uniform vec3  uColorMajor;
        uniform vec3  uCenter;
        uniform float uFade;

        // Anti-aliased grid line intensity for a given cell size (uses derivatives).
        float lineFactor(vec2 coord, float cell) {
          vec2 c = coord / cell;
          vec2 d = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          return 1.0 - min(min(d.x, d.y), 1.0);
        }

        void main() {
          vec2 p = vWorld.xz;
          float minorL = lineFactor(p, uCell);
          float majorL = lineFactor(p, uCell * uMajor);

          float dist = length(p - uCenter.xz);
          float fade = 1.0 - smoothstep(uFade * 0.5, uFade, dist);

          float a = max(minorL * 0.46, majorL * 0.82) * fade;
          if (a < 0.002) discard;

          vec3 col = majorL > minorL ? uColorMajor : uColor;
          gl_FragColor = vec4(col, a);
        }
      `});o.extensions={derivatives:!0};const a=new At(s,o);a.rotation.x=-Math.PI/2,a.position.y=-3.2+.01,a.renderOrder=1,a.frustumCulled=!1,this.scene.add(a),this.grid=a}applyTheme(e){const t=e==="dark";this._theme=e,this.scene.background=new Ve(t?856347:16052974),this.ground&&(this.ground.material.color.set(t?1119775:13814978),this.ground.material.opacity=t?.18:.13),this.grid&&(this.grid.material.uniforms.uColor.value.set(t?3358812:10992082),this.grid.material.uniforms.uColorMajor.value.set(t?5596570:8690104))}_updateGround(){const e=this.controls.target;if(this.ground&&(this.ground.position.x=e.x,this.ground.position.z=e.z),this.grid){this.grid.position.x=e.x,this.grid.position.z=e.z,this.grid.material.uniforms.uCenter.value.set(e.x,0,e.z);const t=this.camera.position.distanceTo(e);this.grid.material.uniforms.uFade.value=Zs.clamp(t*2.2,30,600)}}_buildPostProcessing(e,t){this.composer=new tC(this.renderer);const i=new nC(this.scene,this.camera);this.composer.addPass(i),this.bloomPass=new Qs(new Me(e,t),.18,.25,.95),this.composer.addPass(this.bloomPass);const r=new sC;this.composer.addPass(r)}_onResize(){const e=this.canvas,t=e.clientWidth,i=e.clientHeight;t===0||i===0||(this.camera.aspect=t/i,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,i,!1),this.composer.setSize(t,i))}setOrbitEnabled(e){this.controls.enabled=e}animateCameraTo(e,t,i=700){const r=this.camera.position.clone(),s=this.controls.target.clone(),o=new O(...Object.values(e)),a=new O(...Object.values(t)),l=performance.now(),c=()=>{const d=Math.min((performance.now()-l)/i,1),f=aC(d);this.camera.position.lerpVectors(r,o,f),this.controls.target.lerpVectors(s,a,f),this.controls.update(),d<1&&requestAnimationFrame(c)};requestAnimationFrame(c)}fitCamera(){const e=Ee.getArmNodes?Ee.getArmNodes():null;if(!e||e.length===0)return;const t=e.map(d=>new O(d.x,d.y,d.z)),i=new O;t.forEach(d=>i.add(d)),i.divideScalar(t.length);let r=0;t.forEach(d=>{r=Math.max(r,d.distanceTo(i))}),r=Math.max(r,.5);const s=Zs.degToRad(this.camera.fov/2),o=Math.max(r*1.45/Math.tan(s),4),a=this.camera.position.clone().sub(this.controls.target),l=new sc().setFromVector3(a);l.radius=o,l.phi=Math.max(.35,Math.min(Math.PI*.44,l.phi)),a.setFromSpherical(l);const c=i.clone().add(a);this.animateCameraTo({x:c.x,y:c.y,z:c.z},{x:i.x,y:i.y,z:i.z})}render(){this.controls.update(),this._updateGround(),this.composer.render()}dispose(){this._resizeObserver.disconnect(),this.renderer.dispose(),this.composer.dispose()}}function aC(n){return n<.5?2*n*n:-1+(4-2*n)*n}function lC(n){const e=new oh(Rp,Rp,n,6,1,!1,Math.PI/6);return e.applyMatrix4(new Qe().makeRotationZ(Math.PI/2)),e.applyMatrix4(new Qe().makeTranslation(n/2,0,0)),e}function cC(){return new Xr(yn,yn,yn*2)}const uC=(()=>{const n=new Xr(yn,yn,yn);return n.applyMatrix4(new Qe().makeTranslation(yn/2,0,0)),n})(),dC=new Rc(Yl,20,20),ug=new ah(Yl*1.55,Yl*.22,10,28),fC=new Rc(Yl*1.3,20,20),Nn={rod:()=>new Xn({color:8032170,roughness:.38,metalness:.55,flatShading:!0}),rodRoot:()=>new Xn({color:16755234,roughness:.18,metalness:.75,emissive:16746496,emissiveIntensity:.4,flatShading:!0}),rodHover:()=>new Xn({color:10402e3,roughness:.2,metalness:.88,emissive:1721480,emissiveIntensity:.22,flatShading:!0}),endRod:()=>new Xn({color:13213728,roughness:.22,metalness:.78,emissive:9067008,emissiveIntensity:.08}),endRodRoot:()=>new Xn({color:16763972,roughness:.14,metalness:.82,emissive:16750848,emissiveIntensity:.55}),twistJoint:()=>new Xn({color:14509568,roughness:.25,metalness:.7,emissive:13386752,emissiveIntensity:.3}),twistJointLimit:()=>new Xn({color:16720384,roughness:.25,metalness:.6,emissive:16720384,emissiveIntensity:.9}),bendJoint:()=>new Xn({color:2767442,roughness:.32,metalness:.78,emissive:21964,emissiveIntensity:.18}),bendJointLimit:()=>new Xn({color:16720384,roughness:.2,metalness:.6,emissive:16720384,emissiveIntensity:.9}),jointRing:()=>new Xn({color:4478310,roughness:.3,metalness:.85})};class Bu{constructor(e){this.scene=e,this.robotGroup=new Rs,e.add(this.robotGroup),this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._facesVisible=!1,this._activeRootId="R1",this._build("R1",[0,0,0,0,0,0]),this._addFacePlanes()}computeAnglesForRoot(e,t="horizontal"){const i={};for(const d of Kn){const f=this._rodMeshes[d];i[d]=f?f.getWorldQuaternion(new Jt):new Jt}const r=this._rodMeshes[e],s=r?r.getWorldPosition(new O):new O,o=i[e].clone(),a=[0,0,0,0,0,0],l=new Set,c=(d,f)=>{l.add(d);for(let h=0;h<xt.length;h++){const p=xt[h],g=p.bodyA===d,y=p.bodyB===d;if(!g&&!y)continue;const m=g?p.bodyB:p.bodyA;if(l.has(m))continue;const u=i[m],_=f.clone().invert().multiply(u);let v;if(p.type==="bend"){const T=new O(1,0,0).applyQuaternion(_);t==="vertical"?v=Math.atan2(T.y,T.x):v=Math.atan2(-T.z,T.x)}else{const T=new O(0,1,0).applyQuaternion(_);v=Math.atan2(T.z,T.y)}v=Math.max(-p.limit,Math.min(p.limit,v)),a[h]=v;const M=p.type==="bend"?new O(0,1,0):new O(1,0,0),A=new Jt().setFromAxisAngle(M,v),b=f.clone().multiply(A);c(m,b)}};return c(e,o),{newAngles:a,rootPos:s,rootQuat:o}}rebuild(e,t,i=null,r=null){for(this._activeRootId=e;this.robotGroup.children.length>0;)this.robotGroup.remove(this.robotGroup.children[0]);this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._build(e,t),this._addFacePlanes(),this._facesVisible&&this.showFaceIndicators(!0),this.robotGroup.position.copy(i??new O),this.robotGroup.quaternion.copy(r??new Jt)}updateAngles(e,t="horizontal"){for(let i=0;i<xt.length;i++){const r=xt[i],s=this._jointNodes[r.id];s&&(r.type==="twist"?s.rotation.x=e[i]:t==="vertical"?(s.rotation.z=e[i],s.rotation.y=0):(s.rotation.y=e[i],s.rotation.z=0))}}setHoverHighlight(e,t){const i=this._rodMats[e];if(!i||e===this._activeRootId)return;const r=this._rodMeshes[e];r&&(r.material=t?i.hover:i.normal,e==="R3"&&this._r3CuboidMesh&&(this._r3CuboidMesh.material=t?i.hover:i.normal))}setLimitHighlight(e,t){const i=this._jointSphereMeshes[e];i&&(i.mesh.material=t?i.limitMat:i.normalMat)}get interactables(){const e=Object.values(this._rodMeshes);return this._r3CuboidMesh&&e.push(this._r3CuboidMesh),e}getEndEffectorWorld(){const i=Kn.indexOf(this._activeRootId)<=3?this._tipR7:this._tipR1;if(!i)return{x:0,y:0,z:0};const r=new O;return i.getWorldPosition(r),{x:r.x,y:r.y,z:r.z}}getNodePositions(){this.robotGroup.updateMatrixWorld(!0);const e=new O;return["J1","J2","J3","J4","J5","J6"].map(t=>{const i=this._jointNodes[t];return i?i.getWorldPosition(e.clone()):new O})}_build(e,t){const i=this._makeRodMesh(e,!0);i.position.set(0,0,0),this.robotGroup.add(i),e==="R1"?(this._tipR1=this._makeTip(),this._tipR1.position.set(this._rodLen("R1"),0,0),i.add(this._tipR1)):e==="R7"&&(this._tipR7=this._makeTip(),this._tipR7.position.set(0,0,0),i.add(this._tipR7)),this._traverseFrom(e,i,t,new Set([e]))}_traverseFrom(e,t,i,r){for(let s=0;s<xt.length;s++){const o=xt[s],a=o.bodyA===e,l=o.bodyB===e;if(!a&&!l)continue;const c=a?o.bodyB:o.bodyA;if(r.has(c))continue;r.add(c);const d=new Ot;d.name=o.id+"_pivot",this._addJointVisual(d,o),a?d.position.set(this._rodLen(e),0,0):d.position.set(0,0,0);const f=i[s]??0;o.type==="twist"?d.rotation.x=f:d.rotation.y=f,this._jointNodes[o.id]=d,t.add(d);const h=this._makeRodMesh(c,!1);if(a?h.position.set(0,0,0):h.position.set(-this._rodLen(c),0,0),d.add(h),c==="R1"){const p=this._makeTip();p.position.set(0,0,0),h.add(p),this._tipR1=p}else if(c==="R7"){const p=this._makeTip();a?p.position.set(this._rodLen("R7"),0,0):p.position.set(0,0,0),h.add(p),this._tipR7=p}this._traverseFrom(c,h,i,r)}}_rodLen(e){return e==="R1"||e==="R7"?yn:ps[e]??JM}_makeRodMesh(e,t){const i=e==="R1"||e==="R7",r=i?uC:lC(this._rodLen(e));let s,o,a;i?(s=Nn.endRod(),o=Nn.endRodRoot(),a=Nn.rodHover()):(s=Nn.rod(),o=Nn.rodRoot(),a=Nn.rodHover());const l=new At(r,t?o:s);if(l.castShadow=!0,l.receiveShadow=!0,l.userData={type:"rod",id:e},l.name=e,this._rodMeshes[e]=l,this._rodMats[e]={normal:s,root:o,hover:a},e==="R3"){const c=t?o.clone():s.clone(),d=new At(cC(),c);d.castShadow=!0,d.receiveShadow=!0,d.userData={type:"rod",id:"R3"},d.name="R3_cuboid",d.position.set(this._rodLen("R3")/2,0,0),l.add(d),this._r3CuboidMesh=d}return l}_addJointVisual(e,t){if(t.type==="twist"){const i=Nn.twistJoint(),r=Nn.twistJointLimit(),s=new At(fC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[t.id]={mesh:s,normalMat:i,limitMat:r}}else{const i=Nn.bendJoint(),r=Nn.bendJointLimit(),s=new At(dC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[t.id]={mesh:s,normalMat:i,limitMat:r};const o=new At(ug,Nn.jointRing());o.castShadow=!0,e.add(o);const a=new At(ug,Nn.jointRing());a.rotation.x=Math.PI/2,a.castShadow=!0,e.add(a)}}getJointWorldData(e="horizontal"){this.robotGroup.updateMatrixWorld(!0);const t=new Jt;return xt.map(i=>{const r=this._jointNodes[i.id];if(!r)return{pos:new O,axis:new O(0,1,0)};const s=r.getWorldPosition(new O),o=i.type==="twist"?new O(1,0,0):e==="vertical"?new O(0,0,1):new O(0,1,0),a=r.parent?r.parent.getWorldQuaternion(t):t.identity();return{pos:s,axis:o.applyQuaternion(a).normalize()}})}_addFacePlanes(){const e=yn*.88,t=new mr(e,e),i=(r,s,o,a,l,c)=>{if(!r)return;const d=new bc({color:43775,transparent:!0,opacity:0,side:Un,depthTest:!1}),f=new At(t,d);f.rotation.y=c,f.position.set(o,a,l),f.userData={type:"face",faceKey:s},f.renderOrder=999,f.visible=!1,r.add(f),this._facePlaneMeshes.push(f)};i(this._rodMeshes.R1,"R1_outer",0,0,0,-Math.PI/2),i(this._rodMeshes.R7,"R7_outer",yn,0,0,+Math.PI/2),i(this._r3CuboidMesh,"R3_cuboid_plusZ",0,0,yn,0),i(this._r3CuboidMesh,"R3_cuboid_minusZ",0,0,-yn,Math.PI)}showFaceIndicators(e){this._facesVisible=e;for(const t of this._facePlaneMeshes)t.visible=e,t.material.opacity=e?.35:0,t.material.needsUpdate=!0}resetFaceHighlights(){for(const e of this._facePlaneMeshes)e.material.color.setHex(43775),e.material.opacity=this._facesVisible?.35:0,e.material.needsUpdate=!0}setFaceHighlight(e,t){const i={normal:{hex:43775,op:.35},selected1:{hex:65416,op:.75},selected2:{hex:16755200,op:.75},error:{hex:16720384,op:.8}}[t]??{hex:43775,op:.35};for(const r of this._facePlaneMeshes)r.userData.faceKey===e&&(r.material.color.setHex(i.hex),r.material.opacity=i.op,r.material.needsUpdate=!0)}getFaceIndicatorMeshes(){return this._facePlaneMeshes}getLinkBounds(){this.robotGroup.updateMatrixWorld(!0);const e={};for(const[t,i]of Object.entries(this._rodMeshes)){i.geometry.boundingBox||i.geometry.computeBoundingBox();const r=i.geometry.boundingBox.clone();if(r.applyMatrix4(i.matrixWorld),t==="R3"&&this._r3CuboidMesh){this._r3CuboidMesh.geometry.boundingBox||this._r3CuboidMesh.geometry.computeBoundingBox();const s=this._r3CuboidMesh.geometry.boundingBox.clone();s.applyMatrix4(this._r3CuboidMesh.matrixWorld),r.union(s)}e[t]=r}return e}_makeTip(){const e=new Ot;return e.name="tip_marker",e}}const dg=new H_;class hC{constructor(e,t,i,r,s){this.canvas=e,this.camera=t,this.getInteractables=i,this.resolveModuleId=r,this.callbacks=s,this._mouseDownPos=new Me,this._dragLastNDC=new Me,this._hitId=null,this._hitModuleId=null,this._hoveredId=null,this._hoveredModuleId=null,this._dragging=!1,this.paused=!1,this._onMouseDown=this._onMouseDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this._onMouseUp=this._onMouseUp.bind(this),this._onTouchStart=this._onTouchStart.bind(this),this._onTouchMove=this._onTouchMove.bind(this),this._onTouchEnd=this._onTouchEnd.bind(this),e.addEventListener("mousedown",this._onMouseDown),e.addEventListener("mousemove",this._onMouseMove),e.addEventListener("mouseup",this._onMouseUp),e.addEventListener("touchstart",this._onTouchStart,{passive:!1}),e.addEventListener("touchmove",this._onTouchMove,{passive:!1}),e.addEventListener("touchend",this._onTouchEnd)}_getNDC(e,t){const i=this.canvas.getBoundingClientRect();return new Me((e-i.left)/i.width*2-1,-((t-i.top)/i.height)*2+1)}_raycastHit(e){var a;dg.setFromCamera(e,this.camera);const t=dg.intersectObjects(this.getInteractables(),!1);if(!t.length)return{rodId:null,moduleId:null};const i=t[0].object;let r=null,s=i;for(;s;){if((a=s.userData)!=null&&a.id){r=s.userData.id;break}s=s.parent}const o=this.resolveModuleId?this.resolveModuleId(i):null;return{rodId:r,moduleId:o}}_onMouseDown(e){if(e.button!==0||this.paused)return;const t=this._getNDC(e.clientX,e.clientY);this._mouseDownPos.copy(t),this._dragLastNDC.copy(t);const i=this._raycastHit(t);this._hitId=i.rodId,this._hitModuleId=i.moduleId,this._dragging=!1}_onMouseMove(e){var i,r,s,o,a,l,c,d;if(this.paused)return;const t=this._getNDC(e.clientX,e.clientY);if(this._hitId&&(!this._dragging&&t.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(r=(i=this.callbacks).onDragStart)==null||r.call(i,this._hitModuleId,this._hitId,t),this.canvas.style.cursor="grabbing"),this._dragging)){const f=t.x-this._dragLastNDC.x,h=t.y-this._dragLastNDC.y;(o=(s=this.callbacks).onDrag)==null||o.call(s,this._hitModuleId,this._hitId,f,h,t),this._dragLastNDC.copy(t);return}if(!this._dragging){const{rodId:f,moduleId:h}=this._raycastHit(t);(f!==this._hoveredId||h!==this._hoveredModuleId)&&(this._hoveredId&&((l=(a=this.callbacks).onHoverChange)==null||l.call(a,this._hoveredModuleId,this._hoveredId,!1)),this._hoveredId=f,this._hoveredModuleId=h,f?((d=(c=this.callbacks).onHoverChange)==null||d.call(c,h,f,!0),this.canvas.style.cursor="grab"):this.canvas.style.cursor="default")}}_onMouseUp(e){var t,i,r,s;e.button!==0||this.paused||(this._dragging?(this._dragging=!1,(i=(t=this.callbacks).onDragEnd)==null||i.call(t),this.canvas.style.cursor=this._hoveredId?"grab":"default"):this._getNDC(e.clientX,e.clientY).distanceTo(this._mouseDownPos)<.015&&this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitModuleId,this._hitId)),this._hitId=null,this._hitModuleId=null)}_onTouchStart(e){if(e.preventDefault(),e.touches.length!==1)return;const t=e.touches[0],i=this._getNDC(t.clientX,t.clientY);this._mouseDownPos.copy(i),this._dragLastNDC.copy(i);const r=this._raycastHit(i);this._hitId=r.rodId,this._hitModuleId=r.moduleId,this._dragging=!1}_onTouchMove(e){var r,s,o,a;if(!this._hitId||e.touches.length!==1)return;e.preventDefault();const t=e.touches[0],i=this._getNDC(t.clientX,t.clientY);if(!this._dragging&&i.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(s=(r=this.callbacks).onDragStart)==null||s.call(r,this._hitModuleId,this._hitId,i)),this._dragging){const l=i.x-this._dragLastNDC.x,c=i.y-this._dragLastNDC.y;(a=(o=this.callbacks).onDrag)==null||a.call(o,this._hitModuleId,this._hitId,l,c,i),this._dragLastNDC.copy(i)}}_onTouchEnd(e){var t,i,r,s;this._dragging?(this._dragging=!1,(i=(t=this.callbacks).onDragEnd)==null||i.call(t)):this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitModuleId,this._hitId)),this._hitId=null,this._hitModuleId=null}dispose(){this.canvas.removeEventListener("mousedown",this._onMouseDown),this.canvas.removeEventListener("mousemove",this._onMouseMove),this.canvas.removeEventListener("mouseup",this._onMouseUp),this.canvas.removeEventListener("touchstart",this._onTouchStart),this.canvas.removeEventListener("touchmove",this._onTouchMove),this.canvas.removeEventListener("touchend",this._onTouchEnd)}}const pC=10,mC=.06,gC=.04,vC=.25,al=3,fg=15;class _C{constructor(e){this.numJoints=e,this.history=Array.from({length:e},()=>[]),this.smoothed=Array.from({length:e},()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}))}update(e,t,i){for(let r=0;r<this.numJoints;r++){const s=this.history[r];s.push({angle:e[r],time:i}),s.length>pC&&s.shift();let o=0;if(s.length>=3){const c=s.length,d=(s[c-1].time-s[c-3].time)/1e3;d>.001&&(o=(s[c-1].angle-s[c-3].angle)/d)}else if(s.length>=2){const c=s.length,d=(s[c-1].time-s[c-2].time)/1e3;d>0&&(o=(s[c-1].angle-s[c-2].angle)/d)}o=Math.max(-al,Math.min(al,o));let a=0;if(s.length>=5){const c=s.length,d=(s[c-3].time-s[c-5].time)/1e3,f=(s[c-1].time-s[c-3].time)/1e3;if(d>.001&&f>.001){const h=(s[c-3].angle-s[c-5].angle)/d,p=Math.max(-al,Math.min(al,h));a=(o-p)/((d+f)*.5)}}a=Math.max(-fg,Math.min(fg,a));const l=this.smoothed[r];this.smoothed[r]={angle:Vu(e[r],l.angle,vC),velocity:Vu(o,l.velocity,mC),acceleration:Vu(a,l.acceleration,gC),limitHit:t[r]??!1}}return this.smoothed.map(r=>({...r}))}reset(){this.history.forEach(e=>e.splice(0)),this.smoothed.forEach(e=>{e.angle=0,e.velocity=0,e.acceleration=0})}seed(e){this.history.forEach(t=>t.splice(0));for(let t=0;t<this.numJoints;t++)this.smoothed[t]={angle:e[t]??0,velocity:0,acceleration:0,limitHit:!1}}}function Vu(n,e,t){return t*n+(1-t)*e}const Hu=new O;function hg(n,e,t,i){return Hu.set(n,e,t).project(i),{x:Hu.x,y:Hu.y}}const pg=.05,mg=.08;function j_(n,e,t,i,r,s,o,a,l,c=.008,d=.5){const f=t.length;if(f===0)return[...o];const h=hg(n.x,n.y,n.z,i);let p=r.x-s.x-h.x,g=r.y-s.y-h.y;const y=Math.sqrt(p*p+g*g);if(y<5e-4)return[...o];if(y>mg){const D=mg/y;p*=D,g*=D}const m=.006,u=new Float64Array(f*2);for(let D=0;D<f;D++){const V=t[D],{pos:I,axis:G}=e[V],B=n.x-I.x,J=n.y-I.y,Z=n.z-I.z,P=G.y*Z-G.z*J,k=G.z*B-G.x*Z,z=G.x*J-G.y*B,H=hg(n.x+P*m,n.y+k*m,n.z+z*m,i);u[D*2]=(H.x-h.x)/m,u[D*2+1]=(H.y-h.y)/m}let _=c,v=0,M=c;for(let D=0;D<f;D++){const V=u[D*2],I=u[D*2+1];_+=V*V,v+=V*I,M+=I*I}const A=_*M-v*v;if(Math.abs(A)<1e-14)return[...o];const b=p*d,T=g*d,N=(M*b-v*T)/A,w=(-v*b+_*T)/A,S=[...o];for(let D=0;D<f;D++){const V=t[D],G=a[V].type==="twist"?Math.PI:l,B=Math.max(-pg,Math.min(pg,u[D*2]*N+u[D*2+1]*w));S[V]=Math.max(-G,Math.min(G,o[V]+B))}return S}const xC=[ps.R2,ps.R3,ps.R4,ps.R5,ps.R6],Gu=yn*2+xC.reduce((n,e)=>n+e,0);class yC{constructor(e,t,i,r,s){this.scene=e,this.robotFK=t,this.interaction=i,this.getStore=r,this.act=s,this._telemetry=new _C(6),this._raf=null,this._lastRootId="R1",this._activeDragRodId=null,this._activeDragModuleId=null,this._activeDragNdc=new Me,this._pickupOffset={x:0,y:0},this._homeAnim=null,this._connectMode=!1,this.extraTick=null,this.postTick=null,this.onInteractionEnd=null,this.activateModule=null,this.getActiveModuleId=null,this.crossModuleStep=null,this.crossModuleEnd=null,this._prevAngles=[0,0,0,0,0,0],this._wasColliding=!1,this.getOtherModuleBounds=null,Ee.getArmNodes=()=>this.robotFK.getNodePositions().map(o=>({x:o.x,y:o.y,z:o.z})),this._setupInteractionCallbacks()}_ikDragNode(e,t){return e>t?Math.min(e,5):Math.max(e-1,0)}_activeJoints(e,t,i){const r=[];if(e>t)for(let s=t;s<i;s++)r.push(s);else for(let s=i+1;s<t;s++)r.push(s);return r}_setupInteractionCallbacks(){this.interaction.callbacks.onHoverChange=(e,t,i)=>{const r=this.getActiveModuleId?this.getActiveModuleId():null;r&&e&&e!==r||this.robotFK.setHoverHighlight(t,i)},this.interaction.callbacks.onRootClick=(e,t)=>{const i=this.getActiveModuleId?this.getActiveModuleId():null;e&&i&&e!==i&&this.activateModule&&this.activateModule(e);const r=this.getStore();if(t===r.activeRootId)return;const s=r.mode||"horizontal",{newAngles:o,rootPos:a,rootQuat:l}=this.robotFK.computeAnglesForRoot(t,s);this.act.setRootAndAngles(t,o),this._lastRootId=t,this.robotFK.rebuild(t,o,a,l),this._telemetry.seed(o)},this.interaction.callbacks.onDragStart=(e,t,i)=>{this.scene.setOrbitEnabled(!1),this._homeAnim=null,i&&this._activeDragNdc.set(i.x,i.y);const r=this.getActiveModuleId?this.getActiveModuleId():null;if(e&&r&&e!==r&&this.crossModuleStep){this._activeDragRodId=t,this._activeDragModuleId=e,this.crossModuleStep(e,t,this._activeDragNdc,this.getStore().mode||"horizontal",!0);return}this._activeDragModuleId=null;const s=this.getStore(),o=Kn.indexOf(s.activeRootId),a=Kn.indexOf(t),l=this._ikDragNode(a,o),d=this.robotFK.getNodePositions()[l],f=new O(d.x,d.y,d.z).project(this.scene.camera);this._pickupOffset=i?{x:i.x-f.x,y:i.y-f.y}:{x:0,y:0},this._activeDragRodId=t},this.interaction.callbacks.onDrag=(e,t,i,r,s)=>{s&&this._activeDragNdc.set(s.x,s.y)},this.interaction.callbacks.onDragEnd=()=>{this._activeDragModuleId&&this.crossModuleEnd&&this.crossModuleEnd(),this._activeDragRodId=null,this._activeDragModuleId=null,this.scene.setOrbitEnabled(!0),this.onInteractionEnd&&this.onInteractionEnd()}}_runIKStep(e,t){const i=this.getStore(),r=i.mode||"horizontal",s=Kn.indexOf(i.activeRootId),o=Kn.indexOf(e);if(o===s)return;const a=this._ikDragNode(o,s),l=this._activeJoints(o,s,a);if(l.length===0)return;const d=this.robotFK.getNodePositions()[a],f=new O(d.x,d.y,d.z),h=this.robotFK.getJointWorldData(r);return j_(f,h,l,this.scene.camera,{x:t.x,y:t.y},this._pickupOffset,i.jointAngles,xt,Go,.008,.5)}swapRobotFK(e){this.robotFK=e}setConnectMode(e){this._connectMode=e}cancelMotion(){this._homeAnim=null,this._activeDragRodId=null,this._activeDragModuleId=null,this.scene.setOrbitEnabled(!0),this.act.clearPendingHome&&this.act.clearPendingHome()}start(){const e=t=>{this._raf=requestAnimationFrame(e),this._frame(t)};this._raf=requestAnimationFrame(e)}stop(){this._raf&&cancelAnimationFrame(this._raf)}_frame(e){const t=this.getStore(),i=t.mode||"horizontal";if(this.extraTick&&this.extraTick(),t.pendingHome&&!this._connectMode){this.act.clearPendingHome(),this._activeDragRodId=null;let m=[...t.jointAngles];if(t.activeRootId!=="R1"){const{newAngles:v,rootPos:M,rootQuat:A}=this.robotFK.computeAnglesForRoot("R1",i);this.act.setRootAndAngles("R1",v),this._lastRootId="R1",this.robotFK.rebuild("R1",v,M,A),this._telemetry.seed(v),m=v}const u=Math.max(.01,...m.map(v=>Math.abs(v))),_=Math.max(1500,600+u*(2200/Math.PI));this._homeAnim={startAngles:m,startTime:e,duration:_}}if(this._homeAnim){const{startAngles:m,startTime:u,duration:_}=this._homeAnim,v=Math.min((e-u)/_,1),M=v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2,A=m.map(I=>I*(1-M));for(let I=0;I<6;I++)this.act.setJointAngle(I,A[I]);this.robotFK.updateAngles(A,i);const b=A.map((I,G)=>Math.abs(I)>=xt[G].limit-.01),T=this._telemetry.update(A,b,e);this.act.setJointTelemetry(T);for(let I=0;I<xt.length;I++)this.robotFK.setLimitHighlight(xt[I].id,b[I]);const N=this.robotFK.getEndEffectorWorld(),w=this.robotFK.robotGroup.position,S=N.x-w.x,D=N.y-w.y,V=N.z-w.z;if(this.act.updateEndEffector(N,Math.min(Math.sqrt(S*S+D*D+V*V)/Gu,1)*100),this.postTick&&this.postTick(),this.scene.render(),v>=1){this._homeAnim=null;for(let I=0;I<6;I++)this.act.setJointAngle(I,0);this.robotFK.updateAngles([0,0,0,0,0,0],i),this._telemetry.seed([0,0,0,0,0,0]),Ee.fitCamera&&Ee.fitCamera()}return}let r=t.jointAngles;if(t.activeRootId!==this._lastRootId){const{newAngles:m,rootPos:u,rootQuat:_}=this.robotFK.computeAnglesForRoot(t.activeRootId,i);this.act.setRootAndAngles(t.activeRootId,m),this._lastRootId=t.activeRootId,this.robotFK.rebuild(t.activeRootId,m,u,_),this._telemetry.seed(m),r=m,this._prevAngles=[...m]}if(this._activeDragRodId&&this._activeDragModuleId&&!this._connectMode&&this.crossModuleStep){this.crossModuleStep(this._activeDragModuleId,this._activeDragRodId,this._activeDragNdc,i,!1),r=this.getStore().jointAngles,this.robotFK.updateAngles(r,i);const m=r.map((T,N)=>Math.abs(T)>=xt[N].limit-.01),u=this._telemetry.update(r,m,e);this.act.setJointTelemetry(u);for(let T=0;T<xt.length;T++)this.robotFK.setLimitHighlight(xt[T].id,m[T]);const _=this.robotFK.getEndEffectorWorld(),v=this.robotFK.robotGroup.position,M=_.x-v.x,A=_.y-v.y,b=_.z-v.z;this.act.updateEndEffector(_,Math.min(Math.sqrt(M*M+A*A+b*b)/Gu,1)*100),this.postTick&&this.postTick(),this.scene.render();return}let s=[...r],o=!1;if(this._activeDragRodId&&!this._connectMode){const m=this._runIKStep(this._activeDragRodId,this._activeDragNdc);m&&(s=m,o=!0)}this.robotFK.updateAngles(s,i);{let m=!1;if(this.getOtherModuleBounds&&!m){const u=new Dn().setFromObject(this.robotFK.robotGroup);for(const _ of this.getOtherModuleBounds())if(u.clone().expandByScalar(-.05).intersectsBox(_.clone().expandByScalar(-.05))){m=!0;break}}if(!m){const u=["R1","R2","R3","R4","R5","R6","R7"],_=this.robotFK.getLinkBounds();e:for(let v=0;v<u.length;v++)for(let M=v+3;M<u.length;M++){const A=_[u[v]],b=_[u[M]];if(A&&b&&A.clone().expandByScalar(-.02).intersectsBox(b.clone().expandByScalar(-.02))){m=!0;break e}}}if(m)this.robotFK.updateAngles(this._prevAngles,i),r=this._prevAngles,this._wasColliding||this.act.setAllAngles(this._prevAngles);else{if(o){for(let u=0;u<6;u++)this.act.setJointAngle(u,s[u]);r=s}this._prevAngles=[...r]}this._wasColliding=m,this.act.setCollision(m)}const a=r.map((m,u)=>Math.abs(m)>=xt[u].limit-.01),l=this._telemetry.update(r,a,e);this.act.setJointTelemetry(l);for(let m=0;m<xt.length;m++)this.robotFK.setLimitHighlight(xt[m].id,a[m]);const c=this.robotFK.getEndEffectorWorld(),d=this.robotFK.robotGroup.position,f=c.x-d.x,h=c.y-d.y,p=c.z-d.z,g=Math.sqrt(f*f+h*h+p*p),y=Math.min(g/Gu,1)*100;this.act.updateEndEffector(c,y),this.postTick&&this.postTick(),this.scene.render()}}const W_="tetrobot:theme",MC=(()=>{try{return localStorage.getItem(W_)==="dark"?"dark":"light"}catch{return"light"}})(),eo=_a((n,e)=>({theme:MC,setTheme(t){try{localStorage.setItem(W_,t)}catch{}n({theme:t})},toggleTheme(){e().setTheme(e().theme==="dark"?"light":"dark")}}));let Eo,ju,fs,ll;function Wu(n,e=1/0,t=null){ju||(ju=new mr(2,2,1,1)),fs||(fs=new Vt({uniforms:{blitTexture:new uh(n)},vertexShader:`
			varying vec2 vUv;
			void main(){
				vUv = uv;
				gl_Position = vec4(position.xy * 1.0,0.,.999999);
			}`,fragmentShader:`
			uniform sampler2D blitTexture; 
			varying vec2 vUv;

			void main(){ 
				gl_FragColor = vec4(vUv.xy, 0, 1);
				
				#ifdef IS_SRGB
				gl_FragColor = LinearTosRGB( texture2D( blitTexture, vUv) );
				#else
				gl_FragColor = texture2D( blitTexture, vUv);
				#endif
			}`})),fs.uniforms.blitTexture.value=n,fs.defines.IS_SRGB=n.colorSpace==_n,fs.needsUpdate=!0,ll||(ll=new At(ju,fs),ll.frustumCulled=!1);const i=new xn,r=new rc;r.add(ll),t===null&&(t=Eo=new B_({antialias:!1}));const s=Math.min(n.image.width,e),o=Math.min(n.image.height,e);t.setSize(s,o),t.clear(),t.render(r,i);const a=document.createElement("canvas"),l=a.getContext("2d");a.width=s,a.height=o,l.drawImage(t.domElement,0,0,s,o);const c=new Ib(a);return c.minFilter=n.minFilter,c.magFilter=n.magFilter,c.wrapS=n.wrapS,c.wrapT=n.wrapT,c.name=n.name,Eo&&(Eo.forceContextLoss(),Eo.dispose(),Eo=null),c}const gg={POSITION:["byte","byte normalized","unsigned byte","unsigned byte normalized","short","short normalized","unsigned short","unsigned short normalized"],NORMAL:["byte normalized","short normalized"],TANGENT:["byte normalized","short normalized"],TEXCOORD:["byte","byte normalized","unsigned byte","short","short normalized","unsigned short"]};class fh{constructor(){this.pluginCallbacks=[],this.register(function(e){return new NC(e)}),this.register(function(e){return new LC(e)}),this.register(function(e){return new FC(e)}),this.register(function(e){return new OC(e)}),this.register(function(e){return new kC(e)}),this.register(function(e){return new zC(e)}),this.register(function(e){return new IC(e)}),this.register(function(e){return new DC(e)}),this.register(function(e){return new UC(e)}),this.register(function(e){return new BC(e)}),this.register(function(e){return new VC(e)}),this.register(function(e){return new HC(e)}),this.register(function(e){return new GC(e)}),this.register(function(e){return new jC(e)})}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,i,r){const s=new PC,o=[];for(let a=0,l=this.pluginCallbacks.length;a<l;a++)o.push(this.pluginCallbacks[a](s));s.setPlugins(o),s.write(e,t,r).catch(i)}parseAsync(e,t){const i=this;return new Promise(function(r,s){i.parse(e,r,s,t)})}}const qe={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,BYTE:5120,UNSIGNED_BYTE:5121,SHORT:5122,UNSIGNED_SHORT:5123,INT:5124,UNSIGNED_INT:5125,FLOAT:5126,ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,NEAREST:9728,LINEAR:9729,NEAREST_MIPMAP_NEAREST:9984,LINEAR_MIPMAP_NEAREST:9985,NEAREST_MIPMAP_LINEAR:9986,LINEAR_MIPMAP_LINEAR:9987,CLAMP_TO_EDGE:33071,MIRRORED_REPEAT:33648,REPEAT:10497},Xu="KHR_mesh_quantization",En={};En[Sn]=qe.NEAREST;En[m_]=qe.NEAREST_MIPMAP_NEAREST;En[No]=qe.NEAREST_MIPMAP_LINEAR;En[Fn]=qe.LINEAR;En[Sl]=qe.LINEAR_MIPMAP_NEAREST;En[Ji]=qe.LINEAR_MIPMAP_LINEAR;En[Zi]=qe.CLAMP_TO_EDGE;En[Zl]=qe.REPEAT;En[Jl]=qe.MIRRORED_REPEAT;const vg={scale:"scale",position:"translation",quaternion:"rotation",morphTargetInfluences:"weights"},SC=new Ve,_g=12,EC=1179937895,wC=2,xg=8,TC=1313821514,AC=5130562;function Io(n,e){return n.length===e.length&&n.every(function(t,i){return t===e[i]})}function bC(n){return new TextEncoder().encode(n).buffer}function CC(n){return Io(n.elements,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function RC(n,e,t){const i={min:new Array(n.itemSize).fill(Number.POSITIVE_INFINITY),max:new Array(n.itemSize).fill(Number.NEGATIVE_INFINITY)};for(let r=e;r<e+t;r++)for(let s=0;s<n.itemSize;s++){let o;n.itemSize>4?o=n.array[r*n.itemSize+s]:(s===0?o=n.getX(r):s===1?o=n.getY(r):s===2?o=n.getZ(r):s===3&&(o=n.getW(r)),n.normalized===!0&&(o=Zs.normalize(o,n.array))),i.min[s]=Math.min(i.min[s],o),i.max[s]=Math.max(i.max[s],o)}return i}function X_(n){return Math.ceil(n/4)*4}function $u(n,e=0){const t=X_(n.byteLength);if(t!==n.byteLength){const i=new Uint8Array(t);if(i.set(new Uint8Array(n)),e!==0)for(let r=n.byteLength;r<t;r++)i[r]=e;return i.buffer}return n}function yg(){return typeof document>"u"&&typeof OffscreenCanvas<"u"?new OffscreenCanvas(1,1):document.createElement("canvas")}function Mg(n,e){if(n.toBlob!==void 0)return new Promise(i=>n.toBlob(i,e));let t;return e==="image/jpeg"?t=.92:e==="image/webp"&&(t=.8),n.convertToBlob({type:e,quality:t})}class PC{constructor(){this.plugins=[],this.options={},this.pending=[],this.buffers=[],this.byteOffset=0,this.buffers=[],this.nodeMap=new Map,this.skins=[],this.extensionsUsed={},this.extensionsRequired={},this.uids=new Map,this.uid=0,this.json={asset:{version:"2.0",generator:"THREE.GLTFExporter r"+wc}},this.cache={meshes:new Map,attributes:new Map,attributesNormalized:new Map,materials:new Map,textures:new Map,images:new Map}}setPlugins(e){this.plugins=e}async write(e,t,i={}){this.options=Object.assign({binary:!1,trs:!1,onlyVisible:!0,maxTextureSize:1/0,animations:[],includeCustomExtensions:!1},i),this.options.animations.length>0&&(this.options.trs=!0),this.processInput(e),await Promise.all(this.pending);const r=this,s=r.buffers,o=r.json;i=r.options;const a=r.extensionsUsed,l=r.extensionsRequired,c=new Blob(s,{type:"application/octet-stream"}),d=Object.keys(a),f=Object.keys(l);if(d.length>0&&(o.extensionsUsed=d),f.length>0&&(o.extensionsRequired=f),o.buffers&&o.buffers.length>0&&(o.buffers[0].byteLength=c.size),i.binary===!0){const h=new FileReader;h.readAsArrayBuffer(c),h.onloadend=function(){const p=$u(h.result),g=new DataView(new ArrayBuffer(xg));g.setUint32(0,p.byteLength,!0),g.setUint32(4,AC,!0);const y=$u(bC(JSON.stringify(o)),32),m=new DataView(new ArrayBuffer(xg));m.setUint32(0,y.byteLength,!0),m.setUint32(4,TC,!0);const u=new ArrayBuffer(_g),_=new DataView(u);_.setUint32(0,EC,!0),_.setUint32(4,wC,!0);const v=_g+m.byteLength+y.byteLength+g.byteLength+p.byteLength;_.setUint32(8,v,!0);const M=new Blob([u,m,y,g,p],{type:"application/octet-stream"}),A=new FileReader;A.readAsArrayBuffer(M),A.onloadend=function(){t(A.result)}}}else if(o.buffers&&o.buffers.length>0){const h=new FileReader;h.readAsDataURL(c),h.onloadend=function(){const p=h.result;o.buffers[0].uri=p,t(o)}}else t(o)}serializeUserData(e,t){if(Object.keys(e.userData).length===0)return;const i=this.options,r=this.extensionsUsed;try{const s=JSON.parse(JSON.stringify(e.userData));if(i.includeCustomExtensions&&s.gltfExtensions){t.extensions===void 0&&(t.extensions={});for(const o in s.gltfExtensions)t.extensions[o]=s.gltfExtensions[o],r[o]=!0;delete s.gltfExtensions}Object.keys(s).length>0&&(t.extras=s)}catch(s){console.warn("THREE.GLTFExporter: userData of '"+e.name+"' won't be serialized because of JSON.stringify error - "+s.message)}}getUID(e,t=!1){if(this.uids.has(e)===!1){const r=new Map;r.set(!0,this.uid++),r.set(!1,this.uid++),this.uids.set(e,r)}return this.uids.get(e).get(t)}isNormalizedNormalAttribute(e){if(this.cache.attributesNormalized.has(e))return!1;const i=new O;for(let r=0,s=e.count;r<s;r++)if(Math.abs(i.fromBufferAttribute(e,r).length()-1)>5e-4)return!1;return!0}createNormalizedNormalAttribute(e){const t=this.cache;if(t.attributesNormalized.has(e))return t.attributesNormalized.get(e);const i=e.clone(),r=new O;for(let s=0,o=i.count;s<o;s++)r.fromBufferAttribute(i,s),r.x===0&&r.y===0&&r.z===0?r.setX(1):r.normalize(),i.setXYZ(s,r.x,r.y,r.z);return t.attributesNormalized.set(e,i),i}applyTextureTransform(e,t){let i=!1;const r={};(t.offset.x!==0||t.offset.y!==0)&&(r.offset=t.offset.toArray(),i=!0),t.rotation!==0&&(r.rotation=t.rotation,i=!0),(t.repeat.x!==1||t.repeat.y!==1)&&(r.scale=t.repeat.toArray(),i=!0),i&&(e.extensions=e.extensions||{},e.extensions.KHR_texture_transform=r,this.extensionsUsed.KHR_texture_transform=!0)}buildMetalRoughTexture(e,t){if(e===t)return e;function i(p){return p.colorSpace===_n?function(y){return y<.04045?y*.0773993808:Math.pow(y*.9478672986+.0521327014,2.4)}:function(y){return y}}console.warn("THREE.GLTFExporter: Merged metalnessMap and roughnessMap textures."),e instanceof Fu&&(e=Wu(e)),t instanceof Fu&&(t=Wu(t));const r=e?e.image:null,s=t?t.image:null,o=Math.max(r?r.width:0,s?s.width:0),a=Math.max(r?r.height:0,s?s.height:0),l=yg();l.width=o,l.height=a;const c=l.getContext("2d");c.fillStyle="#00ffff",c.fillRect(0,0,o,a);const d=c.getImageData(0,0,o,a);if(r){c.drawImage(r,0,0,o,a);const p=i(e),g=c.getImageData(0,0,o,a).data;for(let y=2;y<g.length;y+=4)d.data[y]=p(g[y]/256)*256}if(s){c.drawImage(s,0,0,o,a);const p=i(t),g=c.getImageData(0,0,o,a).data;for(let y=1;y<g.length;y+=4)d.data[y]=p(g[y]/256)*256}c.putImageData(d,0,0);const h=(e||t).clone();return h.source=new Qf(l),h.colorSpace=Si,h.channel=(e||t).channel,e&&t&&e.channel!==t.channel&&console.warn("THREE.GLTFExporter: UV channels for metalnessMap and roughnessMap textures must match."),h}processBuffer(e){const t=this.json,i=this.buffers;return t.buffers||(t.buffers=[{byteLength:0}]),i.push(e),0}processBufferView(e,t,i,r,s){const o=this.json;o.bufferViews||(o.bufferViews=[]);let a;switch(t){case qe.BYTE:case qe.UNSIGNED_BYTE:a=1;break;case qe.SHORT:case qe.UNSIGNED_SHORT:a=2;break;default:a=4}let l=e.itemSize*a;s===qe.ARRAY_BUFFER&&(l=Math.ceil(l/4)*4);const c=X_(r*l),d=new DataView(new ArrayBuffer(c));let f=0;for(let g=i;g<i+r;g++){for(let y=0;y<e.itemSize;y++){let m;e.itemSize>4?m=e.array[g*e.itemSize+y]:(y===0?m=e.getX(g):y===1?m=e.getY(g):y===2?m=e.getZ(g):y===3&&(m=e.getW(g)),e.normalized===!0&&(m=Zs.normalize(m,e.array))),t===qe.FLOAT?d.setFloat32(f,m,!0):t===qe.INT?d.setInt32(f,m,!0):t===qe.UNSIGNED_INT?d.setUint32(f,m,!0):t===qe.SHORT?d.setInt16(f,m,!0):t===qe.UNSIGNED_SHORT?d.setUint16(f,m,!0):t===qe.BYTE?d.setInt8(f,m):t===qe.UNSIGNED_BYTE&&d.setUint8(f,m),f+=a}f%l!==0&&(f+=l-f%l)}const h={buffer:this.processBuffer(d.buffer),byteOffset:this.byteOffset,byteLength:c};return s!==void 0&&(h.target=s),s===qe.ARRAY_BUFFER&&(h.byteStride=l),this.byteOffset+=c,o.bufferViews.push(h),{id:o.bufferViews.length-1,byteLength:0}}processBufferViewImage(e){const t=this,i=t.json;return i.bufferViews||(i.bufferViews=[]),new Promise(function(r){const s=new FileReader;s.readAsArrayBuffer(e),s.onloadend=function(){const o=$u(s.result),a={buffer:t.processBuffer(o),byteOffset:t.byteOffset,byteLength:o.byteLength};t.byteOffset+=o.byteLength,r(i.bufferViews.push(a)-1)}})}processAccessor(e,t,i,r){const s=this.json,o={1:"SCALAR",2:"VEC2",3:"VEC3",4:"VEC4",9:"MAT3",16:"MAT4"};let a;if(e.array.constructor===Float32Array)a=qe.FLOAT;else if(e.array.constructor===Int32Array)a=qe.INT;else if(e.array.constructor===Uint32Array)a=qe.UNSIGNED_INT;else if(e.array.constructor===Int16Array)a=qe.SHORT;else if(e.array.constructor===Uint16Array)a=qe.UNSIGNED_SHORT;else if(e.array.constructor===Int8Array)a=qe.BYTE;else if(e.array.constructor===Uint8Array)a=qe.UNSIGNED_BYTE;else throw new Error("THREE.GLTFExporter: Unsupported bufferAttribute component type: "+e.array.constructor.name);if(i===void 0&&(i=0),(r===void 0||r===1/0)&&(r=e.count),r===0)return null;const l=RC(e,i,r);let c;t!==void 0&&(c=e===t.index?qe.ELEMENT_ARRAY_BUFFER:qe.ARRAY_BUFFER);const d=this.processBufferView(e,a,i,r,c),f={bufferView:d.id,byteOffset:d.byteOffset,componentType:a,count:r,max:l.max,min:l.min,type:o[e.itemSize]};return e.normalized===!0&&(f.normalized=!0),s.accessors||(s.accessors=[]),s.accessors.push(f)-1}processImage(e,t,i,r="image/png"){if(e!==null){const s=this,o=s.cache,a=s.json,l=s.options,c=s.pending;o.images.has(e)||o.images.set(e,{});const d=o.images.get(e),f=r+":flipY/"+i.toString();if(d[f]!==void 0)return d[f];a.images||(a.images=[]);const h={mimeType:r},p=yg();p.width=Math.min(e.width,l.maxTextureSize),p.height=Math.min(e.height,l.maxTextureSize);const g=p.getContext("2d");if(i===!0&&(g.translate(0,p.height),g.scale(1,-1)),e.data!==void 0){t!==Zn&&console.error("GLTFExporter: Only RGBAFormat is supported.",t),(e.width>l.maxTextureSize||e.height>l.maxTextureSize)&&console.warn("GLTFExporter: Image size is bigger than maxTextureSize",e);const m=new Uint8ClampedArray(e.height*e.width*4);for(let u=0;u<m.length;u+=4)m[u+0]=e.data[u+0],m[u+1]=e.data[u+1],m[u+2]=e.data[u+2],m[u+3]=e.data[u+3];g.putImageData(new ImageData(m,e.width,e.height),0,0)}else if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap||typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas)g.drawImage(e,0,0,p.width,p.height);else throw new Error("THREE.GLTFExporter: Invalid image type. Use HTMLImageElement, HTMLCanvasElement, ImageBitmap or OffscreenCanvas.");l.binary===!0?c.push(Mg(p,r).then(m=>s.processBufferViewImage(m)).then(m=>{h.bufferView=m})):p.toDataURL!==void 0?h.uri=p.toDataURL(r):c.push(Mg(p,r).then(m=>new FileReader().readAsDataURL(m)).then(m=>{h.uri=m}));const y=a.images.push(h)-1;return d[f]=y,y}else throw new Error("THREE.GLTFExporter: No valid image data found. Unable to process texture.")}processSampler(e){const t=this.json;t.samplers||(t.samplers=[]);const i={magFilter:En[e.magFilter],minFilter:En[e.minFilter],wrapS:En[e.wrapS],wrapT:En[e.wrapT]};return t.samplers.push(i)-1}processTexture(e){const i=this.options,r=this.cache,s=this.json;if(r.textures.has(e))return r.textures.get(e);s.textures||(s.textures=[]),e instanceof Fu&&(e=Wu(e,i.maxTextureSize));let o=e.userData.mimeType;o==="image/webp"&&(o="image/png");const a={sampler:this.processSampler(e),source:this.processImage(e.image,e.format,e.flipY,o)};e.name&&(a.name=e.name),this._invokeAll(function(c){c.writeTexture&&c.writeTexture(e,a)});const l=s.textures.push(a)-1;return r.textures.set(e,l),l}processMaterial(e){const t=this.cache,i=this.json;if(t.materials.has(e))return t.materials.get(e);if(e.isShaderMaterial)return console.warn("GLTFExporter: THREE.ShaderMaterial not supported."),null;i.materials||(i.materials=[]);const r={pbrMetallicRoughness:{}};e.isMeshStandardMaterial!==!0&&e.isMeshBasicMaterial!==!0&&console.warn("GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.");const s=e.color.toArray().concat([e.opacity]);if(Io(s,[1,1,1,1])||(r.pbrMetallicRoughness.baseColorFactor=s),e.isMeshStandardMaterial?(r.pbrMetallicRoughness.metallicFactor=e.metalness,r.pbrMetallicRoughness.roughnessFactor=e.roughness):(r.pbrMetallicRoughness.metallicFactor=.5,r.pbrMetallicRoughness.roughnessFactor=.5),e.metalnessMap||e.roughnessMap){const a=this.buildMetalRoughTexture(e.metalnessMap,e.roughnessMap),l={index:this.processTexture(a),channel:a.channel};this.applyTextureTransform(l,a),r.pbrMetallicRoughness.metallicRoughnessTexture=l}if(e.map){const a={index:this.processTexture(e.map),texCoord:e.map.channel};this.applyTextureTransform(a,e.map),r.pbrMetallicRoughness.baseColorTexture=a}if(e.emissive){const a=e.emissive;if(Math.max(a.r,a.g,a.b)>0&&(r.emissiveFactor=e.emissive.toArray()),e.emissiveMap){const c={index:this.processTexture(e.emissiveMap),texCoord:e.emissiveMap.channel};this.applyTextureTransform(c,e.emissiveMap),r.emissiveTexture=c}}if(e.normalMap){const a={index:this.processTexture(e.normalMap),texCoord:e.normalMap.channel};e.normalScale&&e.normalScale.x!==1&&(a.scale=e.normalScale.x),this.applyTextureTransform(a,e.normalMap),r.normalTexture=a}if(e.aoMap){const a={index:this.processTexture(e.aoMap),texCoord:e.aoMap.channel};e.aoMapIntensity!==1&&(a.strength=e.aoMapIntensity),this.applyTextureTransform(a,e.aoMap),r.occlusionTexture=a}e.transparent?r.alphaMode="BLEND":e.alphaTest>0&&(r.alphaMode="MASK",r.alphaCutoff=e.alphaTest),e.side===Un&&(r.doubleSided=!0),e.name!==""&&(r.name=e.name),this.serializeUserData(e,r),this._invokeAll(function(a){a.writeMaterial&&a.writeMaterial(e,r)});const o=i.materials.push(r)-1;return t.materials.set(e,o),o}processMesh(e){const t=this.cache,i=this.json,r=[e.geometry.uuid];if(Array.isArray(e.material))for(let M=0,A=e.material.length;M<A;M++)r.push(e.material[M].uuid);else r.push(e.material.uuid);const s=r.join(":");if(t.meshes.has(s))return t.meshes.get(s);const o=e.geometry;let a;e.isLineSegments?a=qe.LINES:e.isLineLoop?a=qe.LINE_LOOP:e.isLine?a=qe.LINE_STRIP:e.isPoints?a=qe.POINTS:a=e.material.wireframe?qe.LINES:qe.TRIANGLES;const l={},c={},d=[],f=[],h={uv:"TEXCOORD_0",uv1:"TEXCOORD_1",uv2:"TEXCOORD_2",uv3:"TEXCOORD_3",color:"COLOR_0",skinWeight:"WEIGHTS_0",skinIndex:"JOINTS_0"},p=o.getAttribute("normal");p!==void 0&&!this.isNormalizedNormalAttribute(p)&&(console.warn("THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one."),o.setAttribute("normal",this.createNormalizedNormalAttribute(p)));let g=null;for(let M in o.attributes){if(M.slice(0,5)==="morph")continue;const A=o.attributes[M];if(M=h[M]||M.toUpperCase(),/^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/.test(M)||(M="_"+M),t.attributes.has(this.getUID(A))){c[M]=t.attributes.get(this.getUID(A));continue}g=null;const T=A.array;M==="JOINTS_0"&&!(T instanceof Uint16Array)&&!(T instanceof Uint8Array)&&(console.warn('GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.'),g=new Bt(new Uint16Array(T),A.itemSize,A.normalized));const N=this.processAccessor(g||A,o);N!==null&&(M.startsWith("_")||this.detectMeshQuantization(M,A),c[M]=N,t.attributes.set(this.getUID(A),N))}if(p!==void 0&&o.setAttribute("normal",p),Object.keys(c).length===0)return null;if(e.morphTargetInfluences!==void 0&&e.morphTargetInfluences.length>0){const M=[],A=[],b={};if(e.morphTargetDictionary!==void 0)for(const T in e.morphTargetDictionary)b[e.morphTargetDictionary[T]]=T;for(let T=0;T<e.morphTargetInfluences.length;++T){const N={};let w=!1;for(const S in o.morphAttributes){if(S!=="position"&&S!=="normal"){w||(console.warn("GLTFExporter: Only POSITION and NORMAL morph are supported."),w=!0);continue}const D=o.morphAttributes[S][T],V=S.toUpperCase(),I=o.attributes[S];if(t.attributes.has(this.getUID(D,!0))){N[V]=t.attributes.get(this.getUID(D,!0));continue}const G=D.clone();if(!o.morphTargetsRelative)for(let B=0,J=D.count;B<J;B++)for(let Z=0;Z<D.itemSize;Z++)Z===0&&G.setX(B,D.getX(B)-I.getX(B)),Z===1&&G.setY(B,D.getY(B)-I.getY(B)),Z===2&&G.setZ(B,D.getZ(B)-I.getZ(B)),Z===3&&G.setW(B,D.getW(B)-I.getW(B));N[V]=this.processAccessor(G,o),t.attributes.set(this.getUID(I,!0),N[V])}f.push(N),M.push(e.morphTargetInfluences[T]),e.morphTargetDictionary!==void 0&&A.push(b[T])}l.weights=M,A.length>0&&(l.extras={},l.extras.targetNames=A)}const y=Array.isArray(e.material);if(y&&o.groups.length===0)return null;let m=!1;if(y&&o.index===null){const M=[];for(let A=0,b=o.attributes.position.count;A<b;A++)M[A]=A;o.setIndex(M),m=!0}const u=y?e.material:[e.material],_=y?o.groups:[{materialIndex:0,start:void 0,count:void 0}];for(let M=0,A=_.length;M<A;M++){const b={mode:a,attributes:c};if(this.serializeUserData(o,b),f.length>0&&(b.targets=f),o.index!==null){let N=this.getUID(o.index);(_[M].start!==void 0||_[M].count!==void 0)&&(N+=":"+_[M].start+":"+_[M].count),t.attributes.has(N)?b.indices=t.attributes.get(N):(b.indices=this.processAccessor(o.index,o,_[M].start,_[M].count),t.attributes.set(N,b.indices)),b.indices===null&&delete b.indices}const T=this.processMaterial(u[_[M].materialIndex]);T!==null&&(b.material=T),d.push(b)}m===!0&&o.setIndex(null),l.primitives=d,i.meshes||(i.meshes=[]),this._invokeAll(function(M){M.writeMesh&&M.writeMesh(e,l)});const v=i.meshes.push(l)-1;return t.meshes.set(s,v),v}detectMeshQuantization(e,t){if(this.extensionsUsed[Xu])return;let i;switch(t.array.constructor){case Int8Array:i="byte";break;case Uint8Array:i="unsigned byte";break;case Int16Array:i="short";break;case Uint16Array:i="unsigned short";break;default:return}t.normalized&&(i+=" normalized");const r=e.split("_",1)[0];gg[r]&&gg[r].includes(i)&&(this.extensionsUsed[Xu]=!0,this.extensionsRequired[Xu]=!0)}processCamera(e){const t=this.json;t.cameras||(t.cameras=[]);const i=e.isOrthographicCamera,r={type:i?"orthographic":"perspective"};return i?r.orthographic={xmag:e.right*2,ymag:e.top*2,zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near}:r.perspective={aspectRatio:e.aspect,yfov:Zs.degToRad(e.fov),zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near},e.name!==""&&(r.name=e.type),t.cameras.push(r)-1}processAnimation(e,t){const i=this.json,r=this.nodeMap;i.animations||(i.animations=[]),e=fh.Utils.mergeMorphTargetTracks(e.clone(),t);const s=e.tracks,o=[],a=[];for(let l=0;l<s.length;++l){const c=s[l],d=tt.parseTrackName(c.name);let f=tt.findNode(t,d.nodeName);const h=vg[d.propertyName];if(d.objectName==="bones"&&(f.isSkinnedMesh===!0?f=f.skeleton.getBoneByName(d.objectIndex):f=void 0),!f||!h)return console.warn('THREE.GLTFExporter: Could not export animation track "%s".',c.name),null;const p=1;let g=c.values.length/c.times.length;h===vg.morphTargetInfluences&&(g/=f.morphTargetInfluences.length);let y;c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline===!0?(y="CUBICSPLINE",g/=3):c.getInterpolation()===JS?y="STEP":y="LINEAR",a.push({input:this.processAccessor(new Bt(c.times,p)),output:this.processAccessor(new Bt(c.values,g)),interpolation:y}),o.push({sampler:a.length-1,target:{node:r.get(f),path:h}})}return i.animations.push({name:e.name||"clip_"+i.animations.length,samplers:a,channels:o}),i.animations.length-1}processSkin(e){const t=this.json,i=this.nodeMap,r=t.nodes[i.get(e)],s=e.skeleton;if(s===void 0)return null;const o=e.skeleton.bones[0];if(o===void 0)return null;const a=[],l=new Float32Array(s.bones.length*16),c=new Qe;for(let f=0;f<s.bones.length;++f)a.push(i.get(s.bones[f])),c.copy(s.boneInverses[f]),c.multiply(e.bindMatrix).toArray(l,f*16);return t.skins===void 0&&(t.skins=[]),t.skins.push({inverseBindMatrices:this.processAccessor(new Bt(l,16)),joints:a,skeleton:i.get(o)}),r.skin=t.skins.length-1}processNode(e){const t=this.json,i=this.options,r=this.nodeMap;t.nodes||(t.nodes=[]);const s={};if(i.trs){const a=e.quaternion.toArray(),l=e.position.toArray(),c=e.scale.toArray();Io(a,[0,0,0,1])||(s.rotation=a),Io(l,[0,0,0])||(s.translation=l),Io(c,[1,1,1])||(s.scale=c)}else e.matrixAutoUpdate&&e.updateMatrix(),CC(e.matrix)===!1&&(s.matrix=e.matrix.elements);if(e.name!==""&&(s.name=String(e.name)),this.serializeUserData(e,s),e.isMesh||e.isLine||e.isPoints){const a=this.processMesh(e);a!==null&&(s.mesh=a)}else e.isCamera&&(s.camera=this.processCamera(e));if(e.isSkinnedMesh&&this.skins.push(e),e.children.length>0){const a=[];for(let l=0,c=e.children.length;l<c;l++){const d=e.children[l];if(d.visible||i.onlyVisible===!1){const f=this.processNode(d);f!==null&&a.push(f)}}a.length>0&&(s.children=a)}this._invokeAll(function(a){a.writeNode&&a.writeNode(e,s)});const o=t.nodes.push(s)-1;return r.set(e,o),o}processScene(e){const t=this.json,i=this.options;t.scenes||(t.scenes=[],t.scene=0);const r={};e.name!==""&&(r.name=e.name),t.scenes.push(r);const s=[];for(let o=0,a=e.children.length;o<a;o++){const l=e.children[o];if(l.visible||i.onlyVisible===!1){const c=this.processNode(l);c!==null&&s.push(c)}}s.length>0&&(r.nodes=s),this.serializeUserData(e,r)}processObjects(e){const t=new rc;t.name="AuxScene";for(let i=0;i<e.length;i++)t.children.push(e[i]);this.processScene(t)}processInput(e){const t=this.options;e=e instanceof Array?e:[e],this._invokeAll(function(r){r.beforeParse&&r.beforeParse(e)});const i=[];for(let r=0;r<e.length;r++)e[r]instanceof rc?this.processScene(e[r]):i.push(e[r]);i.length>0&&this.processObjects(i);for(let r=0;r<this.skins.length;++r)this.processSkin(this.skins[r]);for(let r=0;r<t.animations.length;++r)this.processAnimation(t.animations[r],e[0]);this._invokeAll(function(r){r.afterParse&&r.afterParse(e)})}_invokeAll(e){for(let t=0,i=this.plugins.length;t<i;t++)e(this.plugins[t])}}class NC{constructor(e){this.writer=e,this.name="KHR_lights_punctual"}writeNode(e,t){if(!e.isLight)return;if(!e.isDirectionalLight&&!e.isPointLight&&!e.isSpotLight){console.warn("THREE.GLTFExporter: Only directional, point, and spot lights are supported.",e);return}const i=this.writer,r=i.json,s=i.extensionsUsed,o={};e.name&&(o.name=e.name),o.color=e.color.toArray(),o.intensity=e.intensity,e.isDirectionalLight?o.type="directional":e.isPointLight?(o.type="point",e.distance>0&&(o.range=e.distance)):e.isSpotLight&&(o.type="spot",e.distance>0&&(o.range=e.distance),o.spot={},o.spot.innerConeAngle=(1-e.penumbra)*e.angle,o.spot.outerConeAngle=e.angle),e.decay!==void 0&&e.decay!==2&&console.warn("THREE.GLTFExporter: Light decay may be lost. glTF is physically-based, and expects light.decay=2."),e.target&&(e.target.parent!==e||e.target.position.x!==0||e.target.position.y!==0||e.target.position.z!==-1)&&console.warn("THREE.GLTFExporter: Light direction may be lost. For best results, make light.target a child of the light with position 0,0,-1."),s[this.name]||(r.extensions=r.extensions||{},r.extensions[this.name]={lights:[]},s[this.name]=!0);const a=r.extensions[this.name].lights;a.push(o),t.extensions=t.extensions||{},t.extensions[this.name]={light:a.length-1}}}class LC{constructor(e){this.writer=e,this.name="KHR_materials_unlit"}writeMaterial(e,t){if(!e.isMeshBasicMaterial)return;const r=this.writer.extensionsUsed;t.extensions=t.extensions||{},t.extensions[this.name]={},r[this.name]=!0,t.pbrMetallicRoughness.metallicFactor=0,t.pbrMetallicRoughness.roughnessFactor=.9}}class IC{constructor(e){this.writer=e,this.name="KHR_materials_clearcoat"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.clearcoat===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.clearcoatFactor=e.clearcoat,e.clearcoatMap){const o={index:i.processTexture(e.clearcoatMap),texCoord:e.clearcoatMap.channel};i.applyTextureTransform(o,e.clearcoatMap),s.clearcoatTexture=o}if(s.clearcoatRoughnessFactor=e.clearcoatRoughness,e.clearcoatRoughnessMap){const o={index:i.processTexture(e.clearcoatRoughnessMap),texCoord:e.clearcoatRoughnessMap.channel};i.applyTextureTransform(o,e.clearcoatRoughnessMap),s.clearcoatRoughnessTexture=o}if(e.clearcoatNormalMap){const o={index:i.processTexture(e.clearcoatNormalMap),texCoord:e.clearcoatNormalMap.channel};e.clearcoatNormalScale.x!==1&&(o.scale=e.clearcoatNormalScale.x),i.applyTextureTransform(o,e.clearcoatNormalMap),s.clearcoatNormalTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class DC{constructor(e){this.writer=e,this.name="KHR_materials_dispersion"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.dispersion===0)return;const r=this.writer.extensionsUsed,s={};s.dispersion=e.dispersion,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class UC{constructor(e){this.writer=e,this.name="KHR_materials_iridescence"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.iridescence===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.iridescenceFactor=e.iridescence,e.iridescenceMap){const o={index:i.processTexture(e.iridescenceMap),texCoord:e.iridescenceMap.channel};i.applyTextureTransform(o,e.iridescenceMap),s.iridescenceTexture=o}if(s.iridescenceIor=e.iridescenceIOR,s.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],s.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1],e.iridescenceThicknessMap){const o={index:i.processTexture(e.iridescenceThicknessMap),texCoord:e.iridescenceThicknessMap.channel};i.applyTextureTransform(o,e.iridescenceThicknessMap),s.iridescenceThicknessTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class FC{constructor(e){this.writer=e,this.name="KHR_materials_transmission"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.transmissionFactor=e.transmission,e.transmissionMap){const o={index:i.processTexture(e.transmissionMap),texCoord:e.transmissionMap.channel};i.applyTextureTransform(o,e.transmissionMap),s.transmissionTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class OC{constructor(e){this.writer=e,this.name="KHR_materials_volume"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.thicknessFactor=e.thickness,e.thicknessMap){const o={index:i.processTexture(e.thicknessMap),texCoord:e.thicknessMap.channel};i.applyTextureTransform(o,e.thicknessMap),s.thicknessTexture=o}s.attenuationDistance=e.attenuationDistance,s.attenuationColor=e.attenuationColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class kC{constructor(e){this.writer=e,this.name="KHR_materials_ior"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.ior===1.5)return;const r=this.writer.extensionsUsed,s={};s.ior=e.ior,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class zC{constructor(e){this.writer=e,this.name="KHR_materials_specular"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.specularIntensity===1&&e.specularColor.equals(SC)&&!e.specularIntensityMap&&!e.specularColorMap)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.specularIntensityMap){const o={index:i.processTexture(e.specularIntensityMap),texCoord:e.specularIntensityMap.channel};i.applyTextureTransform(o,e.specularIntensityMap),s.specularTexture=o}if(e.specularColorMap){const o={index:i.processTexture(e.specularColorMap),texCoord:e.specularColorMap.channel};i.applyTextureTransform(o,e.specularColorMap),s.specularColorTexture=o}s.specularFactor=e.specularIntensity,s.specularColorFactor=e.specularColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class BC{constructor(e){this.writer=e,this.name="KHR_materials_sheen"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.sheen==0)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.sheenRoughnessMap){const o={index:i.processTexture(e.sheenRoughnessMap),texCoord:e.sheenRoughnessMap.channel};i.applyTextureTransform(o,e.sheenRoughnessMap),s.sheenRoughnessTexture=o}if(e.sheenColorMap){const o={index:i.processTexture(e.sheenColorMap),texCoord:e.sheenColorMap.channel};i.applyTextureTransform(o,e.sheenColorMap),s.sheenColorTexture=o}s.sheenRoughnessFactor=e.sheenRoughness,s.sheenColorFactor=e.sheenColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class VC{constructor(e){this.writer=e,this.name="KHR_materials_anisotropy"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.anisotropy==0)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.anisotropyMap){const o={index:i.processTexture(e.anisotropyMap)};i.applyTextureTransform(o,e.anisotropyMap),s.anisotropyTexture=o}s.anisotropyStrength=e.anisotropy,s.anisotropyRotation=e.anisotropyRotation,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class HC{constructor(e){this.writer=e,this.name="KHR_materials_emissive_strength"}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.emissiveIntensity===1)return;const r=this.writer.extensionsUsed,s={};s.emissiveStrength=e.emissiveIntensity,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class GC{constructor(e){this.writer=e,this.name="EXT_materials_bump"}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.bumpScale===1&&!e.bumpMap)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.bumpMap){const o={index:i.processTexture(e.bumpMap),texCoord:e.bumpMap.channel};i.applyTextureTransform(o,e.bumpMap),s.bumpTexture=o}s.bumpFactor=e.bumpScale,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class jC{constructor(e){this.writer=e,this.name="EXT_mesh_gpu_instancing"}writeNode(e,t){if(!e.isInstancedMesh)return;const i=this.writer,r=e,s=new Float32Array(r.count*3),o=new Float32Array(r.count*4),a=new Float32Array(r.count*3),l=new Qe,c=new O,d=new Jt,f=new O;for(let p=0;p<r.count;p++)r.getMatrixAt(p,l),l.decompose(c,d,f),c.toArray(s,p*3),d.toArray(o,p*4),f.toArray(a,p*3);const h={TRANSLATION:i.processAccessor(new Bt(s,3)),ROTATION:i.processAccessor(new Bt(o,4)),SCALE:i.processAccessor(new Bt(a,3))};r.instanceColor&&(h._COLOR_0=i.processAccessor(r.instanceColor)),t.extensions=t.extensions||{},t.extensions[this.name]={attributes:h},i.extensionsUsed[this.name]=!0,i.extensionsRequired[this.name]=!0}}fh.Utils={insertKeyframe:function(n,e){const i=n.getValueSize(),r=new n.TimeBufferType(n.times.length+1),s=new n.ValueBufferType(n.values.length+i),o=n.createInterpolant(new n.ValueBufferType(i));let a;if(n.times.length===0){r[0]=e;for(let l=0;l<i;l++)s[l]=0;a=0}else if(e<n.times[0]){if(Math.abs(n.times[0]-e)<.001)return 0;r[0]=e,r.set(n.times,1),s.set(o.evaluate(e),0),s.set(n.values,i),a=0}else if(e>n.times[n.times.length-1]){if(Math.abs(n.times[n.times.length-1]-e)<.001)return n.times.length-1;r[r.length-1]=e,r.set(n.times,0),s.set(n.values,0),s.set(o.evaluate(e),n.values.length),a=r.length-1}else for(let l=0;l<n.times.length;l++){if(Math.abs(n.times[l]-e)<.001)return l;if(n.times[l]<e&&n.times[l+1]>e){r.set(n.times.slice(0,l+1),0),r[l+1]=e,r.set(n.times.slice(l+1),l+2),s.set(n.values.slice(0,(l+1)*i),0),s.set(o.evaluate(e),(l+1)*i),s.set(n.values.slice((l+1)*i),(l+2)*i),a=l+1;break}}return n.times=r,n.values=s,a},mergeMorphTargetTracks:function(n,e){const t=[],i={},r=n.tracks;for(let s=0;s<r.length;++s){let o=r[s];const a=tt.parseTrackName(o.name),l=tt.findNode(e,a.nodeName);if(a.propertyName!=="morphTargetInfluences"||a.propertyIndex===void 0){t.push(o);continue}if(o.createInterpolant!==o.InterpolantFactoryMethodDiscrete&&o.createInterpolant!==o.InterpolantFactoryMethodLinear){if(o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)throw new Error("THREE.GLTFExporter: Cannot merge tracks with glTF CUBICSPLINE interpolation.");console.warn("THREE.GLTFExporter: Morph target interpolation mode not yet supported. Using LINEAR instead."),o=o.clone(),o.setInterpolation(QS)}const c=l.morphTargetInfluences.length,d=l.morphTargetDictionary[a.propertyIndex];if(d===void 0)throw new Error("THREE.GLTFExporter: Morph target name not found: "+a.propertyIndex);let f;if(i[l.uuid]===void 0){f=o.clone();const p=new f.ValueBufferType(c*f.times.length);for(let g=0;g<f.times.length;g++)p[g*c+d]=f.values[g];f.name=(a.nodeName||"")+".morphTargetInfluences",f.values=p,i[l.uuid]=f,t.push(f);continue}const h=o.createInterpolant(new o.ValueBufferType(1));f=i[l.uuid];for(let p=0;p<f.times.length;p++)f.values[p*c+d]=h.evaluate(f.times[p]);for(let p=0;p<o.times.length;p++){const g=this.insertKeyframe(f,o.times[p]);f.values[g*c+d]=o.values[p]}}return n.tracks=t,n}};class WC{parse(e){let t="",i=0,r=0,s=0;const o=new O,a=new Ve,l=new O,c=new Me,d=[];function f(g){let y=0,m=0,u=0;const _=g.geometry,v=new Be,M=_.getAttribute("position"),A=_.getAttribute("normal"),b=_.getAttribute("uv"),T=_.getIndex();if(t+="o "+g.name+`
`,g.material&&g.material.name&&(t+="usemtl "+g.material.name+`
`),M!==void 0)for(let N=0,w=M.count;N<w;N++,y++)o.fromBufferAttribute(M,N),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z+`
`;if(b!==void 0)for(let N=0,w=b.count;N<w;N++,u++)c.fromBufferAttribute(b,N),t+="vt "+c.x+" "+c.y+`
`;if(A!==void 0){v.getNormalMatrix(g.matrixWorld);for(let N=0,w=A.count;N<w;N++,m++)l.fromBufferAttribute(A,N),l.applyMatrix3(v).normalize(),t+="vn "+l.x+" "+l.y+" "+l.z+`
`}if(T!==null)for(let N=0,w=T.count;N<w;N+=3){for(let S=0;S<3;S++){const D=T.getX(N+S)+1;d[S]=i+D+(A||b?"/"+(b?r+D:"")+(A?"/"+(s+D):""):"")}t+="f "+d.join(" ")+`
`}else for(let N=0,w=M.count;N<w;N+=3){for(let S=0;S<3;S++){const D=N+S+1;d[S]=i+D+(A||b?"/"+(b?r+D:"")+(A?"/"+(s+D):""):"")}t+="f "+d.join(" ")+`
`}i+=y,r+=u,s+=m}function h(g){let y=0;const m=g.geometry,u=g.type,_=m.getAttribute("position");if(t+="o "+g.name+`
`,_!==void 0)for(let v=0,M=_.count;v<M;v++,y++)o.fromBufferAttribute(_,v),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z+`
`;if(u==="Line"){t+="l ";for(let v=1,M=_.count;v<=M;v++)t+=i+v+" ";t+=`
`}if(u==="LineSegments")for(let v=1,M=v+1,A=_.count;v<A;v+=2,M=v+1)t+="l "+(i+v)+" "+(i+M)+`
`;i+=y}function p(g){let y=0;const m=g.geometry,u=m.getAttribute("position"),_=m.getAttribute("color");if(t+="o "+g.name+`
`,u!==void 0){for(let v=0,M=u.count;v<M;v++,y++)o.fromBufferAttribute(u,v),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z,_!==void 0&&(a.fromBufferAttribute(_,v).convertLinearToSRGB(),t+=" "+a.r+" "+a.g+" "+a.b),t+=`
`;t+="p ";for(let v=1,M=u.count;v<=M;v++)t+=i+v+" ";t+=`
`}i+=y}return e.traverse(function(g){g.isMesh===!0&&f(g),g.isLine===!0&&h(g),g.isPoints===!0&&p(g)}),t}}class XC{parse(e,t={}){t=Object.assign({binary:!1},t);const i=t.binary,r=[];let s=0;e.traverse(function(u){if(u.isMesh){const _=u.geometry,v=_.index,M=_.getAttribute("position");s+=v!==null?v.count/3:M.count/3,r.push({object3d:u,geometry:_})}});let o,a=80;if(i===!0){const u=s*2+s*3*4*4+80+4,_=new ArrayBuffer(u);o=new DataView(_),o.setUint32(a,s,!0),a+=4}else o="",o+=`solid exported
`;const l=new O,c=new O,d=new O,f=new O,h=new O,p=new O;for(let u=0,_=r.length;u<_;u++){const v=r[u].object3d,M=r[u].geometry,A=M.index,b=M.getAttribute("position");if(A!==null)for(let T=0;T<A.count;T+=3){const N=A.getX(T+0),w=A.getX(T+1),S=A.getX(T+2);g(N,w,S,b,v)}else for(let T=0;T<b.count;T+=3){const N=T+0,w=T+1,S=T+2;g(N,w,S,b,v)}}return i===!1&&(o+=`endsolid exported
`),o;function g(u,_,v,M,A){l.fromBufferAttribute(M,u),c.fromBufferAttribute(M,_),d.fromBufferAttribute(M,v),A.isSkinnedMesh===!0&&(A.applyBoneTransform(u,l),A.applyBoneTransform(_,c),A.applyBoneTransform(v,d)),l.applyMatrix4(A.matrixWorld),c.applyMatrix4(A.matrixWorld),d.applyMatrix4(A.matrixWorld),y(l,c,d),m(l),m(c),m(d),i===!0?(o.setUint16(a,0,!0),a+=2):(o+=`		endloop
`,o+=`	endfacet
`)}function y(u,_,v){f.subVectors(v,_),h.subVectors(u,_),f.cross(h).normalize(),p.copy(f).normalize(),i===!0?(o.setFloat32(a,p.x,!0),a+=4,o.setFloat32(a,p.y,!0),a+=4,o.setFloat32(a,p.z,!0),a+=4):(o+="	facet normal "+p.x+" "+p.y+" "+p.z+`
`,o+=`		outer loop
`)}function m(u){i===!0?(o.setFloat32(a,u.x,!0),a+=4,o.setFloat32(a,u.y,!0),a+=4,o.setFloat32(a,u.z,!0),a+=4):o+="			vertex "+u.x+" "+u.y+" "+u.z+`
`}}}const $C={R1_outer:0,R7_outer:6,R3_cuboid_plusZ:2,R3_cuboid_minusZ:2};function zs(n,e){const t=new Map;for(const s of n)t.has(s.a.moduleId)||t.set(s.a.moduleId,[]),t.has(s.b.moduleId)||t.set(s.b.moduleId,[]),t.get(s.a.moduleId).push(s.b.moduleId),t.get(s.b.moduleId).push(s.a.moduleId);const i=new Set([e]),r=[e];for(;r.length;){const s=r.shift();for(const o of t.get(s)??[])i.has(o)||(i.add(o),r.push(o))}return i}function oc(n,e){return n.getFaceIndicatorMeshes().find(t=>t.userData.faceKey===e)??null}function YC(n,e,t,i){const r=oc(n,e),s=oc(t,i);return!r||!s?null:(n.robotGroup.updateMatrixWorld(!0),t.robotGroup.updateMatrixWorld(!0),r.updateMatrixWorld(!0),s.updateMatrixWorld(!0),new Qe().copy(r.matrixWorld).invert().multiply(s.matrixWorld).toArray())}function qC(n,e,t,i,r,s){const o=oc(n,e),a=oc(i,r);if(!o||!a||!s)return;n.robotGroup.updateMatrixWorld(!0),o.updateMatrixWorld(!0);const l=new Qe().fromArray(s),c=o.matrixWorld.clone(),d=t?c.clone().multiply(l):c.clone().multiply(l.clone().invert());i.robotGroup.updateMatrixWorld(!0),a.updateMatrixWorld(!0);const f=new Qe().copy(i.robotGroup.matrixWorld).invert().multiply(a.matrixWorld),h=d.clone().multiply(f.clone().invert()),p=new O,g=new Jt,y=new O;h.decompose(p,g,y),i.robotGroup.position.copy(p),i.robotGroup.quaternion.copy(g),i.robotGroup.updateMatrixWorld(!0)}function Yu(n,e,t){const i=new Set([n]);if(!e.length)return i;const r=[n];for(;r.length;){const s=r.shift();for(const o of e){let a,l,c,d;if(o.a.moduleId===s&&!i.has(o.b.moduleId))a=o.a.faceKey,l=o.b.moduleId,c=o.b.faceKey,d=!0;else if(o.b.moduleId===s&&!i.has(o.a.moduleId))a=o.b.faceKey,l=o.a.moduleId,c=o.a.faceKey,d=!1;else continue;const f=t(s),h=t(l);f&&h&&qC(f,a,d,h,c,o.mate),i.add(l),r.push(l)}}return i}function qu(n,e,t){return n.find(i=>{const r=new Set([i.a.moduleId,i.b.moduleId]);return r.has(e)&&r.has(t)})??null}function Ku(n,e){const t=n.a.moduleId===e?n.a:n.b;return $C[t.faceKey]??0}function KC(n,e,t){if(e===t)return[e];const i=new Map;for(const a of n)i.has(a.a.moduleId)||i.set(a.a.moduleId,[]),i.has(a.b.moduleId)||i.set(a.b.moduleId,[]),i.get(a.a.moduleId).push(a.b.moduleId),i.get(a.b.moduleId).push(a.a.moduleId);const r=new Map([[e,null]]),s=[e];for(;s.length;){const a=s.shift();if(a===t)break;for(const l of i.get(a)??[])r.has(l)||(r.set(l,a),s.push(l))}if(!r.has(t))return null;const o=[];for(let a=t;a!=null;a=r.get(a))o.unshift(a);return o}function ZC({welds:n,getFK:e,getAngles:t,baseId:i,baseRootRodId:r,dragId:s,dragRodId:o,mode:a}){const l=KC(n,i,s);if(!l||l.length<2)return null;const c=Kn.indexOf(r),d=[],f=[],h=[],p=[];for(let M=0;M<l.length;M++){const A=l[M],b=e(A);if(!b)return null;const T=b.getJointWorldData(a),N=t(A),w=M===0?c:Ku(qu(n,l[M-1],A),A),S=M===l.length-1?Kn.indexOf(o):Ku(qu(n,A,l[M+1]),A),D=Math.min(w,S),V=Math.max(w,S);for(let I=D;I<V;I++)d.push(T[I]),f.push(N[I]??0),h.push(xt[I]),p.push({moduleId:A,localIdx:I})}if(d.length===0)return null;const y=e(s).getNodePositions(),m=l.length<2?c:Ku(qu(n,l[l.length-2],s),s),u=Kn.indexOf(o),_=u>m?Math.min(u,5):Math.max(u-1,0),v=y[_].clone();return{jointData:d,angles:f,defs:h,backmap:p,dragPos:v}}const $_="tetrobot:autosave:v1";function JC(n){try{localStorage.setItem($_,JSON.stringify(n))}catch{}}function QC(){try{const n=localStorage.getItem($_);return n?JSON.parse(n):null}catch{return null}}const hs=new H_;function eR(n,e,t){var B,J,Z;const i=(B=t.get(n.moduleId))==null?void 0:B.robotFK,r=(J=t.get(e.moduleId))==null?void 0:J.robotFK;if(!i||!r)return;const s=Le.getState(),o=zs(s.welds,n.moduleId),l=zs(s.welds,e.moduleId).size<=o.size,c=l?e:n,d=l?n:e,f=l?r:i,h=l?i:r;i.robotGroup.updateMatrixWorld(!0),r.robotGroup.updateMatrixWorld(!0);const p=h.getFaceIndicatorMeshes().find(P=>P.userData.faceKey===d.faceKey),g=f.getFaceIndicatorMeshes().find(P=>P.userData.faceKey===c.faceKey);if(!p||!g)return;p.updateMatrixWorld(!0),g.updateMatrixWorld(!0);const y=p.getWorldPosition(new O),m=new O(0,0,1).transformDirection(p.matrixWorld).normalize(),u=g.getWorldPosition(new O),_=new O(0,0,1).transformDirection(g.matrixWorld).normalize(),v=new Jt().setFromUnitVectors(_,m.clone().negate()),M=f.robotGroup.position.clone(),A=f.robotGroup.quaternion.clone(),b=v.clone().multiply(A),T=u.clone().sub(M),N=y.clone().sub(T.applyQuaternion(v)),w=new O(1,1,1),S=new Qe().compose(M,A,w),V=new Qe().compose(N,b,w).clone().multiply(S.clone().invert()),I=zs(s.welds,c.moduleId);for(const P of I){const k=(Z=t.get(P))==null?void 0:Z.robotFK;if(!k)continue;const z=new Qe().compose(k.robotGroup.position.clone(),k.robotGroup.quaternion.clone(),w),H=V.clone().multiply(z),X=new O,ue=new Jt,U=new O;H.decompose(X,ue,U),k.robotGroup.position.copy(X),k.robotGroup.quaternion.copy(ue),k.robotGroup.updateMatrixWorld(!0),s.setModuleTransform(P,X,ue)}const G=YC(i,n.faceKey,r,e.faceKey);s.applyJoin({a:{moduleId:n.moduleId,faceKey:n.faceKey},b:{moduleId:e.moduleId,faceKey:e.faceKey},mate:G}),setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},80)}function Zu(n,e){for(const[t,{robotFK:i}]of e)if(i.interactables.includes(n)||i.getFaceIndicatorMeshes().includes(n))return t;return null}function tR(){const n=te.useRef(null),e=te.useRef(null),t=te.useRef(null),i=te.useRef(null),r=te.useRef(new Map),s=te.useRef(null),o=te.useRef("module-0"),a=te.useRef({pickup:null});te.useEffect(()=>{const m=n.current;if(!m)return;const u=yt.getState(),_=Le.getState(),v=new oC(m);e.current=v,v.applyTheme(eo.getState().theme);const M=eo.subscribe(P=>v.applyTheme(P.theme)),A=_.modules[0],b=new Bu(v.scene);b.robotGroup.position.set(A.position.x,A.position.y,A.position.z),r.current.set(A.id,{robotFK:b}),s.current=b;const T=new hC(m,v.camera,()=>{const P=[];for(const[,{robotFK:k}]of r.current)P.push(...k.interactables);return P},P=>Zu(P,r.current),{});i.current=T;const N={setJointAngle:u.setJointAngle,setJointTelemetry:u.setJointTelemetry,setStatus:u.setStatus,updateEndEffector:u.updateEndEffector,setRootRod:u.setRootRod,setRootAndAngles:u.setRootAndAngles,clearPendingHome:u.clearPendingHome,setAllAngles:u.setAllAngles,setCollision:u.setCollision},w=new yC(v,b,T,()=>yt.getState(),N);w.getOtherModuleBounds=()=>{const P=Le.getState(),k=zs(P.welds,P.activeModuleId),z=[];for(const[H,{robotFK:X}]of r.current){if(k.has(H))continue;X.robotGroup.updateMatrixWorld(!0);const ue=new Dn().setFromObject(X.robotGroup);ue.isEmpty()||z.push(ue)}return z},w.extraTick=()=>{const P=Le.getState(),k=P.activeModuleId;for(const[z,{robotFK:H}]of r.current){if(z===k)continue;const X=P.modules.find(ue=>ue.id===z);X&&H.updateAngles(X.angles,X.mode??"horizontal")}},w.postTick=()=>{const P=Le.getState();P.welds.length&&Yu(P.activeModuleId,P.welds,k=>{var z;return((z=r.current.get(k))==null?void 0:z.robotFK)??null})},w.onInteractionEnd=()=>{var H;const P=Le.getState(),k=P.activeModuleId,z=zs(P.welds,k);for(const X of z){if(X===k)continue;const ue=(H=r.current.get(X))==null?void 0:H.robotFK;ue&&P.setModuleTransform(X,ue.robotGroup.position.clone(),ue.robotGroup.quaternion.clone())}setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},60)},Ee.homeAll=()=>{var z;yt.getState().homeArm();const P=Le.getState(),k=o.current;for(const[H,{robotFK:X}]of r.current){if(H===k)continue;const ue=((z=P.modules.find(U=>U.id===H))==null?void 0:z.mode)??"horizontal";P.setModuleAngles(H,[0,0,0,0,0,0]),X.updateAngles([0,0,0,0,0,0],ue)}setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},900)},Ee.estop=()=>{var P;return(P=t.current)==null?void 0:P.cancelMotion()},t.current=w,w.start(),Ee.getArmNodes=()=>{const P=new Dn;let k=!1;for(const[,{robotFK:H}]of r.current){H.robotGroup.updateMatrixWorld(!0);const X=new Dn().setFromObject(H.robotGroup);X.isEmpty()||(P.union(X),k=!0)}if(!k)return[];const z=new O;return P.getCenter(z),[{x:P.min.x,y:P.min.y,z:P.min.z},{x:P.max.x,y:P.max.y,z:P.max.z},{x:z.x,y:z.y,z:z.z}]},Ee.computeFreeSpawn=()=>{const P=new Dn;let k=!1;for(const[,{robotFK:z}]of r.current){z.robotGroup.updateMatrixWorld(!0);const H=new Dn().setFromObject(z.robotGroup);H.isEmpty()||(P.union(H),k=!0)}return k?{x:0,y:0,z:P.max.z+1.2}:{x:0,y:0,z:0}},Ee.commitLiveState=()=>{const P=Le.getState(),k=yt.getState(),z=o.current,H=s.current;H&&z&&P.modules.some(X=>X.id===z)&&P.saveModuleState(z,{angles:[...k.jointAngles],activeRootId:k.activeRootId,position:H.robotGroup.position.clone(),quaternion:H.robotGroup.quaternion.clone(),mode:k.mode});for(const[X,{robotFK:ue}]of r.current)X!==z&&P.setModuleTransform(X,ue.robotGroup.position.clone(),ue.robotGroup.quaternion.clone())},Ee.loadScene=P=>{const k=e.current;if(!k)return{ok:!1,error:"scene not ready"};let z;try{z=eS(P)}catch(H){return{ok:!1,error:H.message}}for(const[,{robotFK:H}]of r.current)k.scene.remove(H.robotGroup);r.current.clear(),Le.setState({modules:z.modules,welds:z.welds,activeModuleId:z.activeModuleId,nextId:z.nextId,connectMode:!1,disconnectMode:!1,deleteMode:!1,dSel1:null,dSel2:null,face1:null,face2:null,connectError:null,disconnectError:null});for(const H of z.modules){const X=new Bu(k.scene);X.robotGroup.position.set(H.position.x,H.position.y,H.position.z),X.robotGroup.quaternion.set(H.quaternion.x,H.quaternion.y,H.quaternion.z,H.quaternion.w),X.updateAngles(H.angles,H.mode??"horizontal"),r.current.set(H.id,{robotFK:X})}return o.current="__none__",s.current=null,c(z.activeModuleId),setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},60),{ok:!0}},Ee.exportModel=P=>{const k=(P||"glb").toLowerCase();if(k==="step")return{ok:!1,error:"STEP is a CAD (solid) format — exporting tessellated meshes to STEP needs a CAD kernel, so it isn’t supported yet. Use OBJ / STL / GLB, or import the .nischay file into Blender."};const z=new Rs;for(const[,{robotFK:X}]of r.current)X.robotGroup.updateMatrixWorld(!0),z.add(X.robotGroup.clone(!0));const H=[];return z.traverse(X=>{var ue;X.isMesh&&(X.visible===!1||((ue=X.userData)==null?void 0:ue.type)==="face")&&H.push(X)}),H.forEach(X=>X.parent&&X.parent.remove(X)),k==="glb"?(new fh().parse(z,X=>{const ue=X instanceof ArrayBuffer?new Blob([X],{type:"model/gltf-binary"}):new Blob([JSON.stringify(X)],{type:"model/gltf+json"});Ml(ue,"tetrobot.glb")},X=>console.error("GLB export failed:",X),{binary:!0,onlyVisible:!0}),{ok:!0}):k==="obj"?(Ml(new Blob([new WC().parse(z)],{type:"text/plain"}),"tetrobot.obj"),{ok:!0}):k==="stl"?(Ml(new Blob([new XC().parse(z)],{type:"model/stl"}),"tetrobot.stl"),{ok:!0}):{ok:!1,error:`Unknown format: ${P}`}};const S=QC();S&&Ee.loadScene(S);let D=null,V=!1;const I=async()=>{V=!0;try{const P=Jv();JC(P);const k=lr.getState();if(k.handle){k.setStatus("saving");try{await oS(k.handle,P),lr.getState().setStatus("saved")}catch{lr.getState().setStatus("idle")}}}catch{}finally{V=!1}},G=()=>{V||(clearTimeout(D),D=setTimeout(I,800))},B=Le.subscribe(G),J=yt.subscribe(G),Z=setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},300);return()=>{clearTimeout(Z),clearTimeout(D),B(),J(),M(),w.stop(),T.dispose(),v.dispose(),r.current.clear(),e.current=null,t.current=null,i.current=null}},[]);const l=Le(m=>m.modules.map(u=>u.id).join(","));te.useEffect(()=>{const m=e.current;if(!m)return;const u=Le.getState();for(const v of u.modules)if(!r.current.has(v.id)){const M=new Bu(m.scene);M.robotGroup.position.set(v.position.x,v.position.y,v.position.z),M.robotGroup.quaternion.set(v.quaternion.x,v.quaternion.y,v.quaternion.z,v.quaternion.w),M.updateAngles(v.angles,v.mode??"horizontal"),u.connectMode&&M.showFaceIndicators(!0),r.current.set(v.id,{robotFK:M})}for(const[v,{robotFK:M}]of r.current)u.modules.find(A=>A.id===v)||(m.scene.remove(M.robotGroup),r.current.delete(v));const _=setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},80);return()=>clearTimeout(_)},[l]);const c=te.useCallback(m=>{var S;const u=t.current;if(!u||o.current===m)return;const _=Le.getState(),v=yt.getState(),M=s.current,A=o.current;M&&A&&A!==m&&_.saveModuleState(A,{angles:[...v.jointAngles],activeRootId:v.activeRootId,position:M.robotGroup.position.clone(),quaternion:M.robotGroup.quaternion.clone(),mode:v.mode});const b=_.modules.find(D=>D.id===m),T=(S=r.current.get(m))==null?void 0:S.robotFK;if(!b||!T)return;const N=T.robotGroup.position.clone(),w=T.robotGroup.quaternion.clone();v.setRootAndAngles(b.activeRootId,b.angles),T.rebuild(b.activeRootId,b.angles,N,w),s.current=T,u.swapRobotFK(T),T.robotGroup.updateMatrixWorld(!0),_.connectMode&&T.showFaceIndicators(!0),o.current=m},[]),d=Le(m=>m.activeModuleId);te.useEffect(()=>{c(d)},[d,c]);const f=te.useCallback((m,u,_,v,M)=>{var z;const A=(z=e.current)==null?void 0:z.camera;if(!A||!m||!u)return;const b=o.current,T=Le.getState(),N=yt.getState(),w=H=>{var X;return((X=r.current.get(H))==null?void 0:X.robotFK)??null},S=H=>{var X;return H===b?N.jointAngles:((X=T.modules.find(ue=>ue.id===H))==null?void 0:X.angles)??[0,0,0,0,0,0]},D=ZC({welds:T.welds,getFK:w,getAngles:S,baseId:b,baseRootRodId:N.activeRootId,dragId:m,dragRodId:u,mode:v});if(!D)return;if(M){const H=D.dragPos.clone().project(A);a.current.pickup={x:_.x-H.x,y:_.y-H.y};return}const V=a.current.pickup??{x:0,y:0},I=D.jointData.map((H,X)=>X),G=j_(D.dragPos,D.jointData,I,A,{x:_.x,y:_.y},V,D.angles,D.defs,Go,.008,.5),B=new Map,J=H=>(B.has(H)||B.set(H,[...S(H)]),B.get(H));D.backmap.forEach((H,X)=>{J(H.moduleId)[H.localIdx]=G[X]});for(const[H,X]of B){const ue=w(H);ue&&ue.updateAngles(X,v)}Yu(b,T.welds,w);let Z=!1;const P=["R1","R2","R3","R4","R5","R6","R7"],k=zs(T.welds,b);e:for(const H of B.keys()){const X=w(H);if(!X)continue;const ue=X.getLinkBounds();for(let U=0;U<P.length;U++)for(let ee=U+3;ee<P.length;ee++){const ie=ue[P[U]],re=ue[P[ee]];if(ie&&re&&ie.clone().expandByScalar(-.02).intersectsBox(re.clone().expandByScalar(-.02))){Z=!0;break e}}}if(!Z){const H=new Map,X=ee=>{if(H.has(ee))return H.get(ee);const ie=w(ee);if(!ie)return H.set(ee,null),null;ie.robotGroup.updateMatrixWorld(!0);const re=new Dn().setFromObject(ie.robotGroup);return H.set(ee,re),re},ue=(ee,ie)=>T.welds.some(re=>{const Ne=new Set([re.a.moduleId,re.b.moduleId]);return Ne.has(ee)&&Ne.has(ie)}),U=[...r.current.keys()];e:for(const ee of k){const ie=X(ee);if(ie)for(const re of U){if(re===ee||ue(ee,re))continue;const Ne=X(re);if(Ne&&ie.clone().expandByScalar(-.05).intersectsBox(Ne.clone().expandByScalar(-.05))){Z=!0;break e}}}}if(Z){for(const[H]of B){const X=w(H);X&&X.updateAngles(S(H),v)}Yu(b,T.welds,w),yt.getState().setCollision(!0);return}for(const[H,X]of B)H===b?yt.getState().setAllAngles(X):T.setModuleAngles(H,X);yt.getState().setCollision(!1)},[]),h=te.useCallback(()=>{a.current.pickup=null},[]);te.useEffect(()=>{const m=t.current;m&&(m.getActiveModuleId=()=>o.current,m.activateModule=u=>{c(u),Le.getState().setActiveModule(u)},m.crossModuleStep=f,m.crossModuleEnd=h)},[c,f,h]);const p=Le(m=>m.connectMode);te.useEffect(()=>{const m=i.current,u=t.current;if(!(!m||!u)){m.paused=p,u.setConnectMode(p);for(const[,{robotFK:_}]of r.current)_.showFaceIndicators(p),p||_.resetFaceHighlights()}},[p]);const g=Le(m=>m.disconnectMode);te.useEffect(()=>{const m=i.current,u=t.current;!m||!u||p||(m.paused=g,u.setConnectMode(g))},[g,p]),te.useEffect(()=>{const m=n.current;if(!m||!g)return;let u=0,_=0;const v=A=>{u=A.clientX,_=A.clientY},M=A=>{var J;const b=A.clientX-u,T=A.clientY-_;if(Math.sqrt(b*b+T*T)>5)return;const N=e.current;if(!N)return;const w=m.getBoundingClientRect(),S=(A.clientX-w.left)/w.width*2-1,D=-((A.clientY-w.top)/w.height)*2+1;hs.setFromCamera({x:S,y:D},N.camera);const V=[];for(const[,{robotFK:Z}]of r.current)V.push(...Z.interactables);const I=hs.intersectObjects(V,!1);if(!I.length)return;const G=Zu(I[0].object,r.current);if(!G)return;const B=Le.getState();if(!B.dSel1)B.setDSel1(G);else if(B.dSel1===G)B.setDisconnectError("Select a DIFFERENT module."),setTimeout(()=>Le.getState().setDisconnectError(null),1500);else{B.setDSel2(G);const Z=(J=r.current.get(G))==null?void 0:J.robotFK;if(Z){const P=B.modules,k=new Set(P.filter(H=>H.id!==G).map(H=>Math.round(H.position.z/4)));let z=0;for(;k.has(z);)z++;Z.robotGroup.position.set(0,0,z*4),Z.robotGroup.quaternion.identity()}B.applyDisconnect(G),setTimeout(()=>{Ee.fitCamera&&Ee.fitCamera()},80)}};return m.addEventListener("mousedown",v),m.addEventListener("mouseup",M),()=>{m.removeEventListener("mousedown",v),m.removeEventListener("mouseup",M)}},[g]);const y=Le(m=>m.deleteMode);return te.useEffect(()=>{const m=i.current,u=t.current;!m||!u||!p&&!g&&(m.paused=y,u.setConnectMode(y))},[y,p,g]),te.useEffect(()=>{const m=n.current;if(!m||!y)return;let u=0,_=0;const v=A=>{u=A.clientX,_=A.clientY},M=A=>{const b=A.clientX-u,T=A.clientY-_;if(Math.sqrt(b*b+T*T)>5)return;const N=e.current;if(!N)return;const w=m.getBoundingClientRect(),S=(A.clientX-w.left)/w.width*2-1,D=-((A.clientY-w.top)/w.height)*2+1;hs.setFromCamera({x:S,y:D},N.camera);const V=[];for(const[,{robotFK:J}]of r.current)V.push(...J.interactables);const I=hs.intersectObjects(V,!1);if(!I.length)return;const G=Zu(I[0].object,r.current);if(!G)return;const B=Le.getState();B.modules.length<=1||(B.setDeleteMode(!1),B.removeModule(G))};return m.addEventListener("mousedown",v),m.addEventListener("mouseup",M),()=>{m.removeEventListener("mousedown",v),m.removeEventListener("mouseup",M)}},[y]),te.useEffect(()=>{const m=n.current;if(!m||!p)return;let u=0,_=0;const v=A=>{u=A.clientX,_=A.clientY},M=A=>{var k;const b=A.clientX-u,T=A.clientY-_;if(Math.sqrt(b*b+T*T)>5)return;const N=e.current;if(!N)return;const w=m.getBoundingClientRect(),S=(A.clientX-w.left)/w.width*2-1,D=-((A.clientY-w.top)/w.height)*2+1;hs.setFromCamera({x:S,y:D},N.camera);const V=[];for(const[z,{robotFK:H}]of r.current)for(const X of H.getFaceIndicatorMeshes())X.userData.moduleId=z,V.push(X);const I=hs.intersectObjects(V,!1);if(!I.length)return;const G=I[0].object,B=G.userData.faceKey,J=G.userData.moduleId,Z=(k=r.current.get(J))==null?void 0:k.robotFK;if(!Z)return;const P=Le.getState();P.face1?J===P.face1.moduleId?(P.setConnectError("Select a face from a DIFFERENT module."),Z.setFaceHighlight(B,"error"),setTimeout(()=>{Z.setFaceHighlight(B,"normal"),Le.getState().setConnectError(null)},1500)):(P.setFace2({moduleId:J,faceKey:B}),Z.setFaceHighlight(B,"selected2"),eR(P.face1,{moduleId:J,faceKey:B},r.current)):(P.setFace1({moduleId:J,faceKey:B}),Z.setFaceHighlight(B,"selected1"))};return m.addEventListener("mousedown",v),m.addEventListener("mouseup",M),()=>{m.removeEventListener("mousedown",v),m.removeEventListener("mouseup",M)}},[p]),x.jsx("canvas",{ref:n,style:{display:"block",width:"100%",height:"100%"}})}function nR(){const n=yt(s=>s.collision),e=yt(s=>s.joints),t=e.some(s=>s.limitHit),i=e.some(s=>Math.abs(s.velocity)>1);let r;return n?r={label:"BLOCKED",dot:"#ff3b30",pulse:!0}:t?r={label:"JOINT LIMIT",dot:"#ff7a00",pulse:!0}:i?r={label:"MOVING",dot:"#00cc66",pulse:!0}:r={label:"IDLE",dot:"#00aaff",pulse:!1},x.jsxs("div",{className:`status-bar fade-in ${r.pulse?"pulse":""}`,children:[x.jsx("div",{className:"status-dot",style:{background:r.dot,boxShadow:`0 0 8px ${r.dot}`,animation:r.pulse?"dotPulse 0.8s ease-in-out infinite alternate":"none"}}),x.jsx("span",{className:"status-label",style:{color:r.dot},children:r.label})]})}const Qd=110,_i=Qd/2,Sg=40,iR=14,rR=10,Eg=[{key:"+X",dir:[1,0,0],label:"X",color:"#e84040",glow:"#ff000044",isPos:!0},{key:"-X",dir:[-1,0,0],label:"-X",color:"#cc6666",glow:"#cc000022",isPos:!1},{key:"+Y",dir:[0,1,0],label:"Y",color:"#22cc55",glow:"#00ff4444",isPos:!0},{key:"-Y",dir:[0,-1,0],label:"-Y",color:"#66bb88",glow:"#00cc2222",isPos:!1},{key:"+Z",dir:[0,0,1],label:"Z",color:"#4488ff",glow:"#0044ff44",isPos:!0},{key:"-Z",dir:[0,0,-1],label:"-Z",color:"#7799cc",glow:"#0022cc22",isPos:!1}],sR={"+X":{pos:{x:14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"-X":{pos:{x:-14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"+Y":{pos:{x:0,y:14,z:.5},lookAt:{x:0,y:0,z:0}},"-Y":{pos:{x:.5,y:-5,z:6},lookAt:{x:0,y:0,z:0}},"+Z":{pos:{x:0,y:1.5,z:14},lookAt:{x:0,y:0,z:0}},"-Z":{pos:{x:0,y:1.5,z:-14},lookAt:{x:0,y:0,z:0}}},wg={pos:{x:0,y:7,z:9},lookAt:{x:0,y:0,z:0}},wo=new O;function oR(){const[n,e]=te.useState([]),[t,i]=te.useState(null),r=te.useRef(null),s=te.useRef(!1),o=te.useRef({x:0,y:0}),a=te.useRef(null);te.useEffect(()=>{const p=()=>{const g=Ee.camera;if(g){g.updateMatrixWorld();const y=Eg.map(m=>(wo.set(...m.dir),wo.transformDirection(g.matrixWorldInverse),{...m,sx:_i+wo.x*Sg,sy:_i-wo.y*Sg,depth:wo.z}));y.sort((m,u)=>u.depth-m.depth),e(y)}r.current=requestAnimationFrame(p)};return r.current=requestAnimationFrame(p),()=>cancelAnimationFrame(r.current)},[]);const l=te.useCallback(p=>{const g=sR[p];g&&Ee.animateTo&&Ee.animateTo(g.pos,g.lookAt)},[]),c=te.useCallback(()=>{Ee.animateTo&&Ee.animateTo(wg.pos,wg.lookAt)},[]),d=te.useCallback(p=>{var g;p.stopPropagation(),(g=a.current)==null||g.setPointerCapture(p.pointerId),s.current=!0,o.current={x:p.clientX,y:p.clientY}},[]),f=te.useCallback(p=>{if(!s.current)return;const g=p.clientX-o.current.x,y=p.clientY-o.current.y;o.current={x:p.clientX,y:p.clientY},Ee.orbitDelta&&Ee.orbitDelta(g,y)},[]),h=te.useCallback(p=>{var g;s.current=!1,(g=a.current)==null||g.releasePointerCapture(p.pointerId)},[]);return x.jsxs("div",{className:"gizmo-wrap",children:[x.jsxs("svg",{ref:a,width:Qd,height:Qd,style:{overflow:"visible",display:"block",cursor:s.current?"grabbing":"grab"},onPointerMove:f,onPointerUp:h,children:[x.jsx("defs",{children:x.jsxs("radialGradient",{id:"gizmo-bg",cx:"50%",cy:"50%",r:"50%",children:[x.jsx("stop",{offset:"0%",stopColor:"rgba(255,255,255,0.22)"}),x.jsx("stop",{offset:"100%",stopColor:"rgba(200,215,235,0.06)"})]})}),x.jsx("circle",{cx:_i,cy:_i,r:_i-4,fill:"url(#gizmo-bg)",stroke:"rgba(180,200,225,0.4)",strokeWidth:"1",style:{cursor:"grab"},onPointerDown:d}),n.map(p=>{const g=p.depth<0;return x.jsx("line",{x1:_i,y1:_i,x2:p.sx,y2:p.sy,stroke:p.color,strokeWidth:g?2:1,opacity:g?.85:.28,style:{pointerEvents:"none"}},`ln-${p.key}`)}),n.map(p=>{const g=p.depth<0,y=p.isPos?iR:rR,m=t===p.key,u=g?1:p.isPos?.42:.2;return x.jsxs("g",{opacity:u,style:{cursor:"pointer"},onMouseEnter:()=>i(p.key),onMouseLeave:()=>i(null),onClick:_=>{_.stopPropagation(),l(p.key)},children:[m&&x.jsx("circle",{cx:p.sx,cy:p.sy,r:y+5,fill:p.glow,stroke:p.color,strokeWidth:"1",opacity:"0.7"}),x.jsx("rect",{x:p.sx-y,y:p.sy-y,width:y*2,height:y*2,rx:p.isPos?4:3,fill:m||p.isPos?p.color:"rgba(200,215,235,0.75)",stroke:p.isPos?"rgba(255,255,255,0.4)":"rgba(120,140,170,0.3)",strokeWidth:"0.8"}),x.jsx("text",{x:p.sx,y:p.sy,textAnchor:"middle",dominantBaseline:"central",fontSize:p.isPos?9.5:7,fontWeight:"700",fontFamily:"'Share Tech Mono', monospace",fill:p.isPos?"white":"#334466",style:{pointerEvents:"none",userSelect:"none"},children:p.label})]},`dot-${p.key}`)}),x.jsx("circle",{cx:_i,cy:_i,r:"6",fill:"rgba(80,100,130,0.75)",stroke:"rgba(255,255,255,0.65)",strokeWidth:"1",style:{cursor:"pointer"},onClick:p=>{p.stopPropagation(),c()}})]}),x.jsx("div",{className:"gizmo-btn-row",children:["+X","+Y","+Z"].map(p=>{var g;return x.jsx("button",{className:"gizmo-axis-btn",onClick:()=>l(p),style:{"--ax-color":(g=Eg.find(y=>y.key===p))==null?void 0:g.color},children:p},p)})})]})}function aR({isConnOpen:n,onConnToggle:e}){const t=te.useCallback(()=>{Ee.fitCamera&&Ee.fitCamera()},[]);return x.jsxs("div",{className:"view-controls",children:[x.jsxs("button",{className:"view-btn",onClick:t,title:"Fit arm in view",children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("rect",{x:"1",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"9",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"1",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"9",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"})]}),"FIT"]}),x.jsxs("button",{className:`view-btn${n?" view-btn--active":""}`,onClick:e,title:"Toggle connection panel",children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("path",{d:"M1.5 5.5C1.5 3.3 3.3 1.5 5.5 1.5",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"}),x.jsx("path",{d:"M1.5 9C1.5 5.4 4.2 2.5 7.5 2",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round",opacity:"0.5"}),x.jsx("path",{d:"M4 7C4 5.3 5.3 4 7 4",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"}),x.jsx("circle",{cx:"7",cy:"9",r:"2",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"9",r:"0.8",fill:"currentColor"})]}),"CONN"]})]})}const lR=120;function cR(){const n=new Date,e=n.getHours().toString().padStart(2,"0"),t=n.getMinutes().toString().padStart(2,"0"),i=n.getSeconds().toString().padStart(2,"0"),r=n.getMilliseconds().toString().padStart(3,"0");return`${e}:${t}:${i}.${r}`}function To(n,e,t){return{id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:cR(),level:n,src:e,msg:t}}function Ao(n,e){return n.length>=lR?[...n.slice(1),e]:[...n,e]}const nt=_a((n,e)=>({espUrl:"http://nischaylap.local",connected:!1,latencyMs:null,servoOnlineCount:0,pendingAngles:null,lastSentAngles:{},simLog:[],ctrlLog:[],stats:{queued:0,sent:0,failed:0},avgVoltage:null,totalCurrentMA:null,overcurrentServos:[],setEspUrl:t=>n({espUrl:t}),setConnected:(t,i)=>n({connected:t,latencyMs:i??null}),setServoOnlineCount:t=>n({servoOnlineCount:t}),setAvgVoltage:t=>n({avgVoltage:t}),setTotalCurrentMA:t=>n({totalCurrentMA:t}),setOvercurrentServos:t=>n({overcurrentServos:t}),queueAngles:t=>{const{lastSentAngles:i,connected:r}=e();if(!r)return!1;const s={};for(const[a,l]of Object.entries(t)){const c=i[a];(c==null||Math.abs(l-c)>=.8)&&(s[a]=l)}if(!Object.keys(s).length)return!1;const o=Object.entries(s).sort(([a],[l])=>Number(a)-Number(l)).map(([a,l])=>`J${a}→${Number(l).toFixed(1)}°`).join(" ");return n(a=>({pendingAngles:{...t},stats:{...a.stats,queued:a.stats.queued+1},simLog:Ao(a.simLog,To("queued","SIM",`TX ${o}`))})),!0},consumeAngles:()=>n({pendingAngles:null}),markSent:t=>n(i=>({lastSentAngles:{...i.lastSentAngles,...t}})),simSent:t=>n(i=>({stats:{...i.stats,sent:i.stats.sent+1},simLog:Ao(i.simLog,To("sent","ESP",`OK  ${t}`))})),simFailed:t=>n(i=>({stats:{...i.stats,failed:i.stats.failed+1},simLog:Ao(i.simLog,To("error","ERR",`ERR ${t}`))})),simOffline:t=>n(i=>({simLog:Ao(i.simLog,To("offline","OFF",`ESP OFFLINE — ${t}`))})),pushCtrlLog:(t,i,r)=>n(s=>({ctrlLog:Ao(s.ctrlLog,To(t,i,r))})),clearSimLog:()=>n({simLog:[]}),clearCtrlLog:()=>n({ctrlLog:[]}),resetStats:()=>n({stats:{queued:0,sent:0,failed:0}})})),zn=[{id:1,label:"J1",name:"CUBE LEFT",type:"twist",color:"#f59e0b"},{id:2,label:"J2",name:"JOINT 1",type:"bend",color:"#6ee7ff"},{id:3,label:"J3",name:"JOINT 2",type:"bend",color:"#a78bfa"},{id:4,label:"J4",name:"WRIST",type:"twist",color:"#fb923c"},{id:5,label:"J5",name:"JOINT 3",type:"bend",color:"#34d399"},{id:6,label:"J6",name:"CUBE RIGHT",type:"twist",color:"#f59e0b"}],uR=(()=>{const n={};let e=0,t=0;for(const i of zn)i.type==="twist"?n[i.id]={type:"twist",num:++e}:n[i.id]={type:"bend",num:++t};return n})(),dR=120,fR=50,Tg=55,Ag=2e3,Y_=8e3;function Ju(n,e=1){return n==null||!Number.isFinite(Number(n))?"—":Number(n).toFixed(e)}function bg(n,e){const t=[...n,e];return t.length>dR&&t.shift(),t}function hR(){const n={};for(const e of zn)n[e.id]={history:{current:[],load:[]}};return n}function pR(n){return zn.reduce((e,t)=>{var i;return e+(((i=n[t.id])==null?void 0:i.currentmA)??0)},0)}function mR(n){var i;let e=null,t=-1/0;for(const r of zn){const s=(i=n[r.id])==null?void 0:i.tempC;s!=null&&s>t&&(t=s,e=r.label)}return e?`${e} (${t}°C)`:"—"}function gR(n){return zn.filter(e=>{var t;return(t=n[e.id])==null?void 0:t.connected}).length}function vR(n,e){const t=[];for(const i of zn){const r=n[i.id];r&&(r.tempC!=null&&r.tempC>Tg&&t.push({id:`temp-${i.id}`,kind:"warn",msg:`${i.label} — ${r.tempC}°C (thermal warning > ${Tg}°C)`}),r.currentmA!=null&&r.currentmA>Ag&&t.push({id:`cur-${i.id}`,kind:"warn",msg:`${i.label} — ${r.currentmA.toFixed(0)} mA (high load > ${Ag} mA)`}))}return e>Y_&&t.push({id:"total-cur",kind:"bad",msg:`System draw ${(e/1e3).toFixed(1)} A — near power limit`}),t}function Cg({values:n,color:e}){const i="scg"+te.useId().replace(/[^a-zA-Z0-9]/g,"");if(!n||n.length<2)return x.jsx("div",{style:{height:66,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-dim)",fontSize:11},children:"no data"});const r=280,s=66,o=Math.min(...n),l=Math.max(...n)-o||1,c=y=>s-5-(y-o)/l*(s-10),d=n.map((y,m)=>`${(m/(n.length-1)*r).toFixed(1)},${c(y).toFixed(1)}`),f=d.join(" "),h=`0,${s} ${f} ${r},${s}`,[p,g]=d[d.length-1].split(",").map(Number);return x.jsxs("svg",{width:"100%",height:s,viewBox:`0 0 ${r} ${s}`,preserveAspectRatio:"none",children:[x.jsx("defs",{children:x.jsxs("linearGradient",{id:i,x1:"0",y1:"0",x2:"0",y2:"1",children:[x.jsx("stop",{offset:"0%",stopColor:e,stopOpacity:.38}),x.jsx("stop",{offset:"100%",stopColor:e,stopOpacity:0})]})}),x.jsx("polygon",{points:h,fill:`url(#${i})`}),x.jsx("polyline",{points:f,fill:"none",stroke:e,strokeWidth:1.8,style:{filter:`drop-shadow(0 0 3px ${e}99)`}}),x.jsx("circle",{cx:p,cy:g,r:3,fill:e,style:{filter:`drop-shadow(0 0 5px ${e})`}})]})}function _R({current:n,target:e,color:t,size:i=100,lo:r=0,hi:s=360,onDrag:o}){const a=i,l=a/2,c=l-7,d=6+c,f=d+12,h=te.useRef(null),p=te.useRef(!1),g=te.useRef(0),y=(H,X)=>{const ue=(H+90)*(Math.PI/180);return[l+X*Math.cos(ue),d+X*Math.sin(ue)]},m=H=>(270-(1-(H-r)/(s-r))*180)%360,[u,_]=y(270,c),[v,M]=y(90,c),[A,b]=y(0,c),T=`M ${u.toFixed(2)} ${_.toFixed(2)} A ${c} ${c} 0 0 0 ${v.toFixed(2)} ${M.toFixed(2)}`,N=n!=null?m(Math.max(r,Math.min(s,n))):null,[w,S]=N!=null?y(N,c):[null,null],D=e!=null?m(Math.max(r,Math.min(s,e))):null,[V,I]=D!=null?y(D,c):[null,null];let G=null;n!=null&&N!=null&&n>r+.5&&(G=`M ${u.toFixed(2)} ${_.toFixed(2)} A ${c} ${c} 0 0 0 ${w.toFixed(2)} ${S.toFixed(2)}`);const B=te.useCallback(H=>{if(!h.current)return null;const X=h.current.getBoundingClientRect(),ue=H.clientX-X.left-l,U=H.clientY-X.top-d;let ee=(Math.atan2(ue,-U)*180/Math.PI+360)%360;if(ee>90&&ee<270)return ee>180?r:s;let ie=ee>=270?ee-270:ee+90;return Math.max(r,Math.min(s,r+ie/180*(s-r)))},[l,d,r,s]),J=te.useCallback(H=>{if(!o)return;H.currentTarget.setPointerCapture(H.pointerId),p.current=!0;const X=B(H);X!=null&&(g.current=Date.now(),o(X))},[o,B]),Z=te.useCallback(H=>{if(!p.current||!o)return;const X=Date.now();if(X-g.current<60)return;g.current=X;const ue=B(H);ue!=null&&o(ue)},[o,B]),P=te.useCallback(()=>{p.current=!1},[]),k=!!o,z=d-c*.28;return x.jsxs("svg",{ref:h,width:a,height:f,viewBox:`0 0 ${a} ${f}`,style:{flexShrink:0,overflow:"visible",cursor:k?"crosshair":"default",touchAction:"none"},onPointerDown:k?J:void 0,onPointerMove:k?Z:void 0,onPointerUp:k?P:void 0,children:[k&&x.jsx("rect",{x:0,y:0,width:a,height:f,fill:"transparent"}),x.jsx("path",{d:T,fill:"none",stroke:"#dde6f0",strokeWidth:7,strokeLinecap:"round"}),G&&x.jsx("path",{d:G,fill:"none",stroke:t,strokeWidth:7,strokeLinecap:"round",style:{filter:`drop-shadow(0 0 4px ${t}88)`}}),x.jsx("line",{x1:(A-4).toFixed(2),y1:b.toFixed(2),x2:(A+4).toFixed(2),y2:b.toFixed(2),stroke:"#b8c8dc",strokeWidth:2.5,strokeLinecap:"round"}),D!=null&&x.jsx("circle",{cx:V.toFixed(2),cy:I.toFixed(2),r:4,fill:"rgba(255,255,255,0.9)",stroke:t,strokeWidth:2}),N!=null&&(()=>{const[H,X]=y(N,c);return x.jsx("circle",{cx:H.toFixed(2),cy:X.toFixed(2),r:k?7:5,fill:t,stroke:"white",strokeWidth:2.5,style:{filter:`drop-shadow(0 0 6px ${t})`}})})(),x.jsx("text",{x:l,y:z,textAnchor:"middle",dominantBaseline:"middle",fill:n!=null?t:"#bbc8d8",fontSize:a*.22,fontWeight:"800",fontFamily:"'Courier New', monospace",children:n!=null?Math.round(n):"—"}),x.jsx("text",{x:l,y:z+a*.155,textAnchor:"middle",fill:"#8aa0be",fontSize:a*.115,fontFamily:"inherit",fontWeight:"600",children:"DEG"})]})}function xR({alerts:n,onDismiss:e}){return n.length===0?null:x.jsx("div",{className:"sc-alerts",children:n.map(t=>x.jsxs("div",{className:`sc-alert sc-alert-${t.kind}`,children:[x.jsx("span",{className:"sc-alert-icon",children:t.kind==="bad"?"🔴":"🟡"}),x.jsx("span",{className:"sc-alert-msg",children:t.msg}),x.jsx("button",{className:"sc-alert-dismiss",onClick:()=>e(t.id),children:"×"})]},t.id))})}function yR({def:n,data:e,onCmd:t}){var N,w;const[i,r]=te.useState("180"),[s,o]=te.useState(10),[a,l]=te.useState(20),c=eo(S=>S.theme),d=c==="dark"?"#f0c040":"#e0a200",f=c==="dark"?"#5b6478":"#9aa3b5",h=(e==null?void 0:e.connected)??!1,p=(e==null?void 0:e.moving)??!1,g=(e==null?void 0:e.torque)??!1,y=(e==null?void 0:e.mode)??"—",m=n.type==="twist"?0:80,u=n.type==="twist"?360:280,_=()=>t(n.id,"pos",{angle:i,speed:s,acc:a}),v=()=>{r("180"),t(n.id,"pos",{angle:180,speed:s,acc:a})},M=S=>h?S:null,A=S=>h&&S!=null&&S>=0?S:null,b=[["Angle",M(e==null?void 0:e.currentAngle),"°",2],["Target",M(e==null?void 0:e.targetAngle),"°",2],["Speed",A(e==null?void 0:e.speed),"raw",0],["Pos",A(e==null?void 0:e.rawPos),"0-4k",0],["Load",A(e==null?void 0:e.loadAbs),"abs",0],["Current",M(e==null?void 0:e.currentmA),"mA",1],["Voltage",M(e==null?void 0:e.voltageV),"V",1],["Temp",M(e==null?void 0:e.tempC),"°C",0]],T=y==="Position"?M(e==null?void 0:e.targetAngle):null;return x.jsxs("div",{className:"sc-card",style:{"--sc-accent":d},children:[x.jsx("div",{className:"sc-card-head",children:x.jsxs("div",{className:"sc-card-head-inner",children:[x.jsx(_R,{current:M(e==null?void 0:e.currentAngle),target:T,color:d,lo:m,hi:u,onDrag:S=>t(n.id,"pos",{angle:S.toFixed(1),speed:s,acc:a})}),x.jsxs("div",{className:"sc-card-info",children:[x.jsxs("div",{className:"sc-card-title",children:[x.jsx("span",{className:"sc-joint-mono",style:{background:`${d}18`,border:`1px solid ${d}55`,color:d},children:n.label}),x.jsx("span",{className:"sc-card-name",style:{color:d},children:n.name}),x.jsx("span",{className:"sc-card-type",children:n.type})]}),x.jsxs("div",{className:"sc-badges",children:[x.jsx("span",{className:`sc-badge ${h?"sc-badge-ok":"sc-badge-bad"}`,children:h?"ONLINE":"OFFLINE"}),x.jsx("span",{className:`sc-badge ${p?"sc-badge-warn":""}`,children:p?"MOVING":"IDLE"}),x.jsx("span",{className:`sc-badge ${g?"sc-badge-ok":"sc-badge-warn"}`,children:g?"TRQ ✓":"TRQ ✗"}),x.jsx("span",{className:"sc-badge",children:y})]})]})]})}),x.jsxs("div",{className:"sc-card-body",children:[x.jsxs("div",{className:"sc-controls",children:[x.jsxs("div",{className:"sc-field",children:[x.jsx("label",{children:"Current (°)"}),x.jsx("span",{className:"sc-angle-input",style:{color:M(e==null?void 0:e.currentAngle)!=null?d:f,cursor:"default"},children:M(e==null?void 0:e.currentAngle)!=null?Ju(M(e==null?void 0:e.currentAngle),1):"—"})]}),x.jsxs("div",{className:"sc-field",children:[x.jsx("label",{children:"Target (°)"}),x.jsx("input",{type:"number",className:"sc-angle-input",min:"0",max:"360",step:"0.1",value:i,onChange:S=>r(S.target.value),style:{color:d}})]}),x.jsxs("div",{className:"sc-field",children:[x.jsxs("label",{children:["Speed  ",x.jsx("span",{className:"sc-slider-val",style:{color:d},children:s})]}),x.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"10",value:s,onChange:S=>o(Number(S.target.value)),style:{"--sc-accent":d}})]}),x.jsxs("div",{className:"sc-field",children:[x.jsxs("label",{children:["Accel  ",x.jsx("span",{className:"sc-slider-val",style:{color:d},children:a})]}),x.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"100",value:a,onChange:S=>l(Number(S.target.value)),style:{"--sc-accent":d}})]})]}),x.jsxs("div",{className:"sc-btns",children:[x.jsx("button",{className:"sc-btn sc-btn-primary",onClick:_,children:"GO"}),n.type==="twist"&&x.jsxs(x.Fragment,{children:[x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"cw"),children:"CW"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"ccw"),children:"CCW"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"wave"),children:"WAVE"})]}),x.jsx("button",{className:"sc-btn sc-btn-danger",onClick:()=>t(n.id,"stop"),children:"■ STOP"}),x.jsx("button",{className:"sc-btn",onClick:v,children:"180°"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"torqueToggle"),children:g?"⟲ T.OFF":"⟲ T.ON"})]}),x.jsx("div",{className:"sc-stats",children:b.map(([S,D,V,I])=>x.jsxs("div",{className:"sc-stat",children:[x.jsx("div",{className:"sc-stat-k",children:S}),x.jsx("div",{className:"sc-stat-v",style:{color:D!=null?d:f},children:D!=null?Ju(D,I):"—"}),x.jsx("div",{className:"sc-stat-u",children:V})]},S))}),x.jsxs("div",{className:"sc-graphs",children:[x.jsxs("div",{className:"sc-graph-box",children:[x.jsxs("div",{className:"sc-graph-hdr",children:[x.jsx("span",{children:"CURRENT"}),x.jsx("span",{className:"sc-graph-val",style:{color:d},children:(e==null?void 0:e.currentmA)!=null?`${Ju(e.currentmA,1)} mA`:"—"})]}),x.jsx(Cg,{values:((N=e==null?void 0:e.history)==null?void 0:N.current)??[],color:d})]}),x.jsxs("div",{className:"sc-graph-box",children:[x.jsxs("div",{className:"sc-graph-hdr",children:[x.jsx("span",{children:"LOAD ABS"}),x.jsx("span",{className:"sc-graph-val",style:{color:d},children:(e==null?void 0:e.loadAbs)!=null?String(e.loadAbs):"—"})]}),x.jsx(Cg,{values:((w=e==null?void 0:e.history)==null?void 0:w.load)??[],color:d})]})]})]})]})}function MR({onCmd:n,onEstop:e}){const t=zn.map(r=>r.id),i=(r,s={})=>t.forEach(o=>n(o,r,s));return x.jsxs("div",{className:"sc-group-strip",children:[x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:()=>i("pos",{angle:180,speed:5,acc:40}),children:"Home All"}),x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:e,children:"⚡ E-STOP"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueon"),children:"Torque ON"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueoff"),children:"Torque OFF"})]})}function SR({servos:n,onCmd:e}){const[t,i]=te.useState([]),[r,s]=te.useState(!1),[o,a]=te.useState(-1),[l,c]=te.useState(1500),d=te.useRef(!1),f=()=>{const u=zn.map(_=>{var v;return{id:_.id,label:_.label,angle:((v=n[_.id])==null?void 0:v.currentAngle)??180}});i(_=>[..._,u])},h=async()=>{if(!(r||t.length===0)){d.current=!1,s(!0);for(let u=0;u<t.length&&!d.current;u++){a(u);for(const{id:_,angle:v}of t[u])await e(_,"pos",{angle:Number(v).toFixed(2),speed:5,acc:20});await new Promise(_=>setTimeout(_,l))}a(-1),s(!1)}},p=()=>{d.current=!0,s(!1),a(-1)},g=u=>i(_=>_.filter((v,M)=>M!==u)),y=()=>{const u=new Blob([JSON.stringify(t,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(u),download:"robo4_sequence.json"}).click()},m=u=>{var M;const _=(M=u.target.files)==null?void 0:M[0];if(!_)return;const v=new FileReader;v.onload=A=>{try{const b=JSON.parse(A.target.result);Array.isArray(b)&&i(b)}catch{}},v.readAsText(_),u.target.value=""};return x.jsxs("div",{className:"sc-seq",children:[x.jsxs("div",{className:"sc-seq-hdr",children:[x.jsx("span",{children:"⟳ Sequence Recorder"}),x.jsxs("span",{className:"sc-seq-count",children:[t.length," frame",t.length!==1?"s":""]})]}),x.jsxs("div",{className:"sc-seq-controls",children:[x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:f,children:"+ Capture"}),r?x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:p,children:"■ Stop"}):x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:h,disabled:t.length===0,children:"▶ Play"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:y,disabled:t.length===0,children:"↓ Export"}),x.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",x.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:m})]}),x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:()=>i([]),disabled:t.length===0,children:"Clear"}),x.jsxs("label",{className:"sc-seq-delay-label",children:["Delay",x.jsx("input",{className:"sc-group-input",type:"number",min:"200",max:"10000",step:"100",value:l,onChange:u=>c(Number(u.target.value))}),"ms"]})]}),t.length>0&&x.jsx("div",{className:"sc-seq-frames",children:t.map((u,_)=>x.jsxs("div",{className:`sc-seq-frame ${o===_?"sc-seq-frame-active":""}`,children:[x.jsxs("span",{className:"sc-seq-frame-num",children:["#",_+1]}),u.map(({label:v,angle:M})=>x.jsxs("span",{className:"sc-seq-chip",children:[v," ",Math.round(M),"°"]},v)),x.jsx("button",{className:"sc-seq-del",onClick:()=>g(_),children:"×"})]},_))})]})}function ER({servos:n,onApply:e}){const[t,i]=te.useState(()=>{try{return JSON.parse(localStorage.getItem("sc_presets")||"[]")}catch{return[]}}),[r,s]=te.useState(""),o=f=>{i(f),localStorage.setItem("sc_presets",JSON.stringify(f))},a=()=>{const f=r.trim()||`Preset ${t.length+1}`,h=zn.map(p=>{var g;return{id:p.id,angle:((g=n[p.id])==null?void 0:g.currentAngle)??180}});o([...t.filter(p=>p.name!==f),{name:f,snapshot:h}]),s("")},l=f=>o(t.filter(h=>h.name!==f)),c=()=>{const f=new Blob([JSON.stringify(t,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(f),download:"robo4_presets.json"}).click()},d=f=>{var g;const h=(g=f.target.files)==null?void 0:g[0];if(!h)return;const p=new FileReader;p.onload=y=>{try{const m=JSON.parse(y.target.result);Array.isArray(m)&&o([...t,...m.filter(u=>u.name&&u.snapshot)])}catch{}},p.readAsText(h),f.target.value=""};return x.jsxs("div",{className:"sc-presets",children:[x.jsxs("div",{className:"sc-presets-hdr",children:[x.jsx("span",{children:"⭐ Presets"}),x.jsx("span",{style:{color:"var(--text-dim)",fontWeight:400,fontSize:11},children:"snapshots all 6 servo angles"}),x.jsx("div",{style:{flex:1}}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:c,disabled:t.length===0,children:"↓ Export"}),x.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",x.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:d})]})]}),x.jsxs("div",{className:"sc-preset-row",children:[x.jsx("input",{className:"sc-preset-name-input",placeholder:"preset name…",value:r,onChange:f=>s(f.target.value),onKeyDown:f=>f.key==="Enter"&&a()}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:a,children:"+ Save"}),t.map(f=>x.jsxs("span",{className:"sc-preset-chip",children:[x.jsx("span",{onClick:()=>e(f.snapshot),children:f.name}),x.jsx("span",{className:"sc-preset-del",onClick:()=>l(f.name),children:"×"})]},f.name)),t.length===0&&x.jsx("span",{style:{fontSize:12,color:"var(--text-dim)"},children:"no presets yet"})]})]})}const wR={SIM:"#f59e0b",USER:"#0077dd",ESP:"#009944",POLL:"#6366f1",OFF:"#f97316",ERR:"#dc2626",SYS:"var(--text-dim)"},TR={ok:"#009944",error:"#dc2626",warn:"#d97706",info:"#0077dd",cmd:"#6366f1",queued:"#8b5cf6",offline:"#f97316"};function AR({log:n,onClear:e}){const t=te.useRef(null);return te.useEffect(()=>{var r;const i=(r=t.current)==null?void 0:r.parentElement;i&&(i.scrollTop=i.scrollHeight)},[n]),x.jsxs("div",{className:"sc-log",children:[x.jsxs("div",{className:"sc-log-hdr",children:[x.jsx("span",{children:"Debug Log"}),x.jsxs("span",{style:{display:"flex",gap:10,alignItems:"center"},children:[x.jsxs("span",{style:{color:"var(--text-dim)",fontWeight:400,fontSize:10},children:[n.length," entries · real-time"]}),x.jsx("button",{onClick:e,style:{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:5,padding:"1px 7px",fontSize:10,cursor:"pointer",color:"var(--text-dim)"},children:"CLR"})]})]}),x.jsxs("div",{className:"sc-log-body",style:{maxHeight:220},children:[n.length===0&&x.jsx("div",{style:{padding:"10px 0",color:"var(--text-dim)",fontSize:11},children:"no activity — connect to ESP32 and drag arm or press buttons"}),n.map((i,r)=>x.jsxs("div",{className:"sc-log-entry",children:[x.jsx("span",{className:"sc-log-time",children:i.time}),x.jsxs("span",{className:"sc-log-src",style:{color:wR[i.src]??"var(--text-dim)"},children:["[",i.src??"?","]"]}),x.jsx("span",{style:{color:TR[i.level??i.kind]??"var(--text-dim)",flex:1},children:i.msg})]},i.id??r)),x.jsx("div",{ref:t})]})]})}function bR(){const n=nt(F=>F.espUrl),e=nt(F=>F.pushCtrlLog),t=nt(F=>F.clearCtrlLog),i=nt(F=>F.ctrlLog),r=nt(F=>F.pendingAngles),s=nt(F=>F.consumeAngles),o=nt(F=>F.markSent),a=nt(F=>F.simSent),l=nt(F=>F.simFailed),c=nt(F=>F.simOffline),d=nt(F=>F.setConnected),f=nt(F=>F.setEspUrl),h=nt(F=>F.setServoOnlineCount),p=nt(F=>F.setAvgVoltage),g=nt(F=>F.setTotalCurrentMA),y=nt(F=>F.setOvercurrentServos),[m,u]=te.useState(n),[_,v]=te.useState(n),[M,A]=te.useState(!1),[b,T]=te.useState(null),[N,w]=te.useState("—"),[S,D]=te.useState(hR),[V,I]=te.useState(null),[G,B]=te.useState([]),J=te.useRef(null),Z=te.useRef(!1),P=te.useRef(new Set),k=te.useRef(!1),z=te.useRef(m);te.useEffect(()=>{k.current=M},[M]),te.useEffect(()=>{z.current=m},[m]),te.useCallback((F,ye="cmd",ce="USER")=>{e(ye,ce,F)},[e]);const H=te.useCallback(async()=>{if(Z.current)return;Z.current=!0;const F=Date.now();try{const ce=await(await fetch(`${m}/api/telemetry`,{cache:"no-store",signal:AbortSignal.timeout(8e3)})).json(),We=Date.now()-F;if(T(We),ce!=null&&ce.ok){k.current||e("ok","SYS",`ESP connected — ${m} (${We}ms)`),A(!0),d(!0,We),w(new Date().toLocaleTimeString()),ce.wifi&&I(ce.wifi);const ve=(ce.servos??[]).reduce((L,C)=>L+(C.currentmA??0),0);D(L=>{const C={...L};for(const $ of ce.servos??[]){const ne=L[$.id]||{history:{current:[],load:[]}};C[$.id]={...$,history:{current:$.currentmA!=null?bg(ne.history.current,$.currentmA):ne.history.current,load:$.loadAbs!=null?bg(ne.history.load,$.loadAbs):ne.history.load}}}return C});const be=vR(Object.fromEntries((ce.servos??[]).map(L=>[L.id,L])),ve).filter(L=>!P.current.has(L.id));B(be);const Re=(ce.servos??[]).filter(L=>L.connected).length;h(Re);const Ie=(ce.servos??[]).filter(L=>L.connected&&L.voltageV!=null);if(Ie.length>0){const L=Ie.reduce((C,$)=>C+$.voltageV,0)/Ie.length;p(L)}Re>0&&g(ve);const rt=(ce.servos??[]).filter(L=>L.connected&&L.currentmA!=null&&L.currentmA>700).map(L=>{const C=uR[L.id]??{type:"twist",num:L.id};return{id:L.id,label:L.label??`J${L.id}`,type:C.type,typeNum:C.num,currentmA:L.currentmA}});if(y(rt),Math.random()<.063){const L=(ce.servos??[]).reduce((C,$)=>$.tempC>C?$.tempC:C,0);e("info","POLL",`${Re}/6 online · ${We}ms · ${(ve/1e3).toFixed(2)}A · ${L}°C`)}}}catch(ye){k.current&&e("error","SYS",`ESP lost — ${ye.message}`),A(!1),d(!1,null),h(0)}finally{Z.current=!1}},[m,e,d]);te.useEffect(()=>(H(),J.current=setInterval(H,fR),()=>clearInterval(J.current)),[H]);const X=te.useCallback(async(F,ye,ce={},We="USER")=>{var Ie,rt;if(ye==="pos"&&ce.angle!=null){const L=(Ie=S[F])==null?void 0:Ie.currentAngle;if(L!=null){const C=Math.abs(Number(ce.angle)-L);if(C>=2){const $=Math.max(6,Math.round(40/(1+C/15)));ce={...ce,acc:$}}}}const be=`${((rt=zn.find(L=>L.id===F))==null?void 0:rt.label)??F} → ${ye}${ce.angle!==void 0?` ${Number(ce.angle).toFixed(1)}°`:""}`;e("cmd",We,be);const Re=new URLSearchParams({servo:String(F),cmd:ye,...ce});try{const L=Date.now(),C=await fetch(`${z.current}/api/command?${Re}`,{signal:AbortSignal.timeout(5e3)});if(!C.ok)throw new Error(C.statusText);e("ok","ESP",`${be} ✓ (${Date.now()-L}ms)`)}catch(L){e("error","ERR",`${be} — ${L.message}`)}},[e,S]),ue=te.useCallback(async()=>{e("error","SYS","⚡ EMERGENCY STOP ALL — killing torque on all servos");try{await fetch(`${z.current}/api/command?servo=all&cmd=estop`,{signal:AbortSignal.timeout(5e3)}),e("ok","ESP","E-STOP acknowledged")}catch(F){e("error","ERR",`E-STOP failed — ${F.message}`)}},[e]),U=()=>{const F=_.trim(),ye=F.startsWith("http")?F:`http://${F}`;u(ye),f(ye),e("info","SYS",`Connecting to ${ye}`)};te.useEffect(()=>{if(!r)return;const F=r;s();const ye=Object.entries(F).sort(([ve],[be])=>Number(ve)-Number(be)).map(([ve,be])=>`J${ve}→${Number(be).toFixed(1)}°`).join(" ");if(e("queued","SIM",`Received from Page 1: ${ye}`),!k.current){e("offline","OFF",`Cannot relay — ESP offline (${z.current})`),c(ye);return}const ce=new URLSearchParams({speed:"5",acc:"20"});Object.entries(F).forEach(([ve,be])=>ce.append(ve,Number(be).toFixed(2))),e("cmd","ESP",`Sending batch → /api/batch?${ce.toString().slice(0,60)}…`);const We=Date.now();fetch(`${z.current}/api/batch?${ce}`,{signal:AbortSignal.timeout(5e3)}).then(async ve=>{if(!ve.ok)throw new Error(ve.statusText);const be=await ve.json(),Re=Date.now()-We;e("ok","ESP",`Batch OK — ${be.sent??"?"} servos updated (${Re}ms)`),a(ye),o(F)}).catch(ve=>{e("error","ERR",`Batch failed — ${ve.message}`),l(`${ye} — ${ve.message}`)})},[r]);const ee=te.useCallback(F=>{e("ok","USER",`Applying preset — ${F.length} servos`);for(const ye of F)X(ye.id,"pos",{angle:ye.angle,speed:5,acc:20},"USER")},[X,e]),ie=te.useCallback(F=>{P.current.add(F),B(ye=>ye.filter(ce=>ce.id!==F))},[]),re=te.useMemo(()=>pR(S),[S]),Ne=te.useMemo(()=>mR(S),[S]),Ue=te.useMemo(()=>gR(S),[S]);return x.jsx("div",{className:"sc-page",children:x.jsxs("div",{className:"sc-wrap",children:[x.jsxs("div",{className:"sc-topbar",children:[x.jsxs("div",{className:"sc-brand",children:[x.jsx("p",{className:"sc-brand-title",children:"TETROBOT Servo Controller"}),x.jsx("p",{className:"sc-brand-sub",children:"6 × ST3215 Smart Servo · Real-time telemetry"})]}),x.jsx("div",{className:"sc-topbar-space"}),x.jsxs("div",{className:"sc-url-row",children:[x.jsx("input",{className:"sc-url-input",value:_,onChange:F=>v(F.target.value),onKeyDown:F=>F.key==="Enter"&&U(),placeholder:"http://nischaylap.local"}),x.jsx("button",{className:"sc-btn",onClick:U,children:"Connect"})]}),x.jsx("div",{className:"sc-topbar-sep"}),x.jsxs("div",{className:"sc-pill",children:[x.jsx("span",{className:`sc-dot ${M?"ok":"bad"}`}),M?"Live":"Disconnected"]}),x.jsxs("div",{className:"sc-pill",children:[x.jsx("span",{className:`sc-dot ${Ue===6?"ok":Ue>0?"warn":"bad"}`}),Ue," / 6"]}),b!=null&&x.jsxs("div",{className:"sc-pill",children:[b," ms"]}),x.jsx("button",{className:"sc-estop",onClick:ue,children:"⚡ E-STOP ALL"})]}),x.jsx(xR,{alerts:G,onDismiss:ie}),x.jsxs("div",{className:"sc-livestrip",children:[x.jsx("span",{className:"sc-ls-label",children:"SERVOS"}),zn.map(F=>{const ye=S[F.id],ce=(ye==null?void 0:ye.connected)??!1,We=(ye==null?void 0:ye.currentAngle)!=null&&ce?Math.round(ye.currentAngle)+"°":"—",ve=(ye==null?void 0:ye.currentmA)!=null&&ce?Math.round(ye.currentmA)+"mA":"";return x.jsxs("div",{className:"sc-ls-servo",children:[x.jsx("span",{className:"sc-ls-dot",style:{background:ce?F.color:"#888",boxShadow:ce?`0 0 7px ${F.color}`:"none"}}),x.jsx("span",{className:"sc-ls-id",style:{color:F.color},children:F.label}),x.jsx("span",{className:"sc-ls-ang",children:We}),ve&&x.jsx("span",{className:"sc-ls-ma",children:ve})]},F.id)}),x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"DRAW"}),x.jsxs("span",{className:"sc-ls-v",style:{color:re>Y_?"var(--danger)":"var(--accent)"},children:[re.toFixed(1)," ",x.jsx("span",{className:"sc-ls-unit",children:"mA"})]})]}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"HOT"}),x.jsx("span",{className:"sc-ls-v",children:Ne})]}),V&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"ESP32"}),x.jsxs("span",{className:"sc-ls-v",children:[V.ip," · ",V.hostname,".local"]})]}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"SSID"}),x.jsx("span",{className:"sc-ls-v",children:V.ssid})]})]}),x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"UPDATED"}),x.jsx("span",{className:"sc-ls-v",children:N})]})]}),x.jsx(MR,{onCmd:X,onEstop:ue}),x.jsx("div",{className:"sc-grid",children:zn.map(F=>x.jsx(yR,{def:F,data:S[F.id],onCmd:X},F.id))}),x.jsx(SR,{servos:S,onCmd:X}),x.jsx(ER,{servos:S,onApply:ee}),x.jsx(AR,{log:i,onClear:t})]})})}const Rg=50;function CR(n){return Math.max(0,Math.min(360,180+n*180/Math.PI))}const RR={queued:"#8b5cf6",sent:"#059669",error:"#dc2626",offline:"#d97706"},PR={SIM:"#f59e0b",ESP:"#22c55e",ERR:"#ef4444",OFF:"#f97316"};function NR(){const n=nt(g=>g.queueAngles),e=nt(g=>g.simLog),t=nt(g=>g.connected),i=nt(g=>g.latencyMs),r=nt(g=>g.stats),s=nt(g=>g.clearSimLog),o=nt(g=>g.resetStats),a=nt(g=>g.espUrl),l=te.useRef([0,0,0,0,0,0]),c=te.useRef("R1"),d=te.useRef(null);te.useEffect(()=>yt.subscribe(y=>{l.current=y.jointAngles,c.current=y.activeRootId}),[]);const f=new Set([2]);te.useEffect(()=>{const g=setInterval(()=>{const y=Kn.indexOf(c.current),m=_=>y>_?-1:1,u={};l.current.forEach((_,v)=>{const M=v+1;let A=CR(_*m(v));f.has(M)&&(A=360-A),u[M]=A}),n(u)},Rg);return()=>clearInterval(g)},[n]),te.useEffect(()=>{const g=d.current;g&&(g.scrollTop=g.scrollHeight)},[e]);const h=e.slice(-40),p=(()=>{try{return new URL(a).hostname}catch{return a}})();return x.jsxs("div",{className:"stp-panel",children:[x.jsxs("div",{className:"stp-header",children:[x.jsxs("div",{className:"stp-header-left",children:[x.jsx("span",{className:"stp-title",children:"SIM → ESP"}),x.jsx("span",{className:`stp-dot ${t?"stp-dot-ok":"stp-dot-off"}`}),x.jsx("span",{className:"stp-conn-label",style:{color:t?"#22c55e":"#f97316"},children:t?"LIVE":"OFFLINE"})]}),x.jsxs("div",{className:"stp-header-right",children:[i!=null&&x.jsxs("span",{className:"stp-lat",children:[i," ms"]}),x.jsx("button",{className:"stp-btn",onClick:s,title:"Clear log",children:"CLR"}),x.jsx("button",{className:"stp-btn stp-btn-reset",onClick:o,title:"Reset counters",children:"RST"})]})]}),x.jsxs("div",{className:"stp-target",children:[x.jsx("span",{className:"stp-target-label",children:"TARGET"}),x.jsx("span",{className:"stp-target-url",children:p}),x.jsxs("span",{className:"stp-target-interval",children:["@",Rg,"ms"]})]}),x.jsxs("div",{className:"stp-stats",children:[x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"QUEUED"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#8b5cf6"},children:r.queued})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"SENT OK"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#22c55e"},children:r.sent})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"FAILED"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#ef4444"},children:r.failed})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"DROP%"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#94a3b8"},children:r.queued>0?(r.failed/r.queued*100).toFixed(0):"0"})]})]}),x.jsxs("div",{className:"stp-log-hdr",children:[x.jsx("span",{children:"TRANSMISSION LOG"}),x.jsxs("span",{className:"stp-log-count",children:[e.length," entries"]})]}),x.jsxs("div",{className:"stp-log-body",ref:d,children:[h.length===0&&x.jsx("div",{className:"stp-empty",children:"drag a joint to start transmitting"}),h.map(g=>x.jsxs("div",{className:"stp-entry",children:[x.jsx("span",{className:"stp-e-time",children:g.time.slice(3)}),x.jsx("span",{className:"stp-e-src",style:{color:PR[g.src]??"#94a3b8"},children:g.src}),x.jsx("span",{className:"stp-e-msg",style:{color:RR[g.level]??"#cbd5e1"},children:g.msg})]},g.id))]})]})}function LR({isOpen:n,onClose:e,children:t}){const[i,r]=te.useState(null),[s,o]=te.useState({w:300,h:430}),[a,l]=te.useState(!1),c=te.useRef(null),d=te.useRef({w:300,h:430});te.useEffect(()=>{d.current=s},[s]),te.useEffect(()=>{n?requestAnimationFrame(()=>l(!0)):l(!1)},[n]);const f=te.useCallback(g=>{var M;if(g.button!==0)return;g.preventDefault();const y=(M=c.current)==null?void 0:M.getBoundingClientRect();if(!y)return;const m=g.clientX-y.left,u=g.clientY-y.top;document.body.style.cursor="grabbing",document.body.style.userSelect="none";const _=A=>{r({x:Math.max(0,Math.min(window.innerWidth-80,A.clientX-m)),y:Math.max(0,Math.min(window.innerHeight-40,A.clientY-u))})},v=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",_),document.removeEventListener("mouseup",v)};document.addEventListener("mousemove",_),document.addEventListener("mouseup",v)},[]),h=te.useCallback(g=>{if(g.button!==0)return;g.preventDefault(),g.stopPropagation();const{w:y,h:m}=d.current,u=g.clientX,_=g.clientY;document.body.style.cursor="nwse-resize",document.body.style.userSelect="none";const v=A=>{o({w:Math.max(240,y+(A.clientX-u)),h:Math.max(280,m+(A.clientY-_))})},M=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",v),document.removeEventListener("mouseup",M)};document.addEventListener("mousemove",v),document.addEventListener("mouseup",M)},[]),p=i?{left:i.x,top:i.y,right:"auto"}:{};return x.jsxs("div",{ref:c,className:`conn-window${a?" conn-window--open":""}`,style:{width:s.w,height:s.h,...p},children:[x.jsxs("div",{className:"conn-window-header",onMouseDown:f,children:[x.jsxs("svg",{width:"14",height:"9",viewBox:"0 0 14 9",fill:"none",className:"conn-drag-dots",children:[x.jsx("circle",{cx:"2",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"7",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"12",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"2",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"7",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"12",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"})]}),x.jsx("span",{className:"conn-window-title",children:"SIM → ESP"}),x.jsx("button",{className:"conn-close-btn",onMouseDown:g=>g.stopPropagation(),onClick:e,title:"Close",children:"✕"})]}),x.jsx("div",{className:"conn-window-body",children:t}),x.jsx("div",{className:"conn-resize-handle",onMouseDown:h})]})}function IR(){const n=lr(i=>i.name),e=lr(i=>i.status),t=n??"untitled";return x.jsxs("div",{className:"doc-indicator",title:n?`Auto-saving changes to ${n}`:"Not saved to a file yet — changes are kept locally. Use SAVE PROJECT to create a file.",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",className:"doc-icon",children:x.jsx("path",{d:"M3 2h7l3 3v9H3V2z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"})}),x.jsx("span",{className:"doc-name",children:t}),n&&e==="saving"&&x.jsxs("span",{className:"doc-status doc-saving",children:[x.jsx("svg",{width:"11",height:"11",viewBox:"0 0 16 16",fill:"none",className:"doc-spin",children:x.jsx("path",{d:"M8 1.5a6.5 6.5 0 106.5 6.5",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round"})}),"saving…"]}),n&&e==="saved"&&x.jsxs("span",{className:"doc-status doc-saved",children:[x.jsx("svg",{width:"11",height:"11",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M3 8.5l3.5 3.5L13 4.5",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),"saved"]}),!n&&x.jsx("span",{className:"doc-status doc-dim",children:"local only"})]})}function DR(){const n=eo(i=>i.theme),e=eo(i=>i.toggleTheme),t=n==="dark";return x.jsx("button",{className:"theme-toggle",onClick:e,title:`Switch to ${t?"light":"dark"} theme`,"aria-label":"Toggle theme",children:t?x.jsxs("svg",{width:"17",height:"17",viewBox:"0 0 20 20",fill:"none",children:[x.jsx("circle",{cx:"10",cy:"10",r:"3.6",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M3.9 3.9l1.6 1.6M14.5 14.5l1.6 1.6M16.1 3.9l-1.6 1.6M5.5 14.5l-1.6 1.6",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"})]}):x.jsx("svg",{width:"17",height:"17",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M16.5 11.8A7 7 0 018.2 3.5 7 7 0 1016.5 11.8z",stroke:"currentColor",strokeWidth:"1.6",strokeLinejoin:"round",fill:"none"})})})}function UR(){const n=yt(e=>e.homeArm);return x.jsxs("div",{className:"sim-toolbar",children:[x.jsxs("button",{className:"sim-tool-btn",onClick:n,title:"Home the active module",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"})}),"HOME"]}),x.jsxs("button",{className:"sim-tool-btn",onClick:()=>{var e;return(e=Ee.homeAll)==null?void 0:e.call(Ee)},title:"Home every module",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"})}),"HOME ALL"]}),x.jsxs("button",{className:"sim-tool-btn sim-tool-btn--danger",onClick:()=>{var e;return(e=Ee.estop)==null?void 0:e.call(Ee)},title:"Stop all motion now",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"8",cy:"8",r:"6",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("rect",{x:"5.5",y:"5.5",width:"5",height:"5",rx:"1",fill:"currentColor"})]}),"E-STOP"]})]})}function FR(){const n=yt(i=>i.collision),t=yt(i=>i.joints).some(i=>i.limitHit);return!n&&!t?null:x.jsxs("div",{className:"workspace-notification",children:[n&&x.jsxs("div",{className:"workspace-notif-row workspace-notif--collision",children:[x.jsx("span",{className:"workspace-notif-dot"}),"COLLISION — movement blocked"]}),t&&!n&&x.jsxs("div",{className:"workspace-notif-row workspace-notif--limit",children:[x.jsx("span",{className:"workspace-notif-dot"}),"JOINT LIMIT reached"]})]})}function OR({pct:n,color:e,width:t=28,height:i=13}){const s=t-2.5,o=1.8,a=Math.max(0,(s-o*2)*n/100),l=(i-i*.45)/2;return x.jsxs("svg",{width:t,height:i,viewBox:`0 0 ${t} ${i}`,style:{flexShrink:0},children:[x.jsx("rect",{x:.75,y:.75,width:s-1.5,height:i-1.5,rx:2,fill:"none",stroke:e,strokeWidth:1.5}),x.jsx("rect",{x:s,y:l,width:2.5,height:i*.45,rx:1,fill:e}),a>0&&x.jsx("rect",{x:o,y:o,width:a,height:i-o*2,rx:1,fill:e})]})}function kR(){const n=nt(r=>r.servoOnlineCount),e=nt(r=>r.avgVoltage);if(n===0||e==null)return null;const t=Math.max(0,Math.min(100,(e-10.8)/(12.6-10.8)*100)),i=t<10?"#ef4444":t<30?"#f97316":"#22c55e";return x.jsxs("div",{className:"app-status-chip",title:`Battery: ${e.toFixed(2)} V avg · ${t.toFixed(0)}%`,children:[x.jsx(OR,{pct:t,color:i}),x.jsxs("span",{style:{fontSize:13,fontWeight:700,color:i,transition:"color 0.4s",letterSpacing:"0.03em"},children:[t.toFixed(0),"%"]}),x.jsxs("span",{style:{fontSize:12,fontWeight:600,color:"var(--text)",marginLeft:1},children:[e.toFixed(1),"V"]})]})}function zR(){const n=nt(o=>o.servoOnlineCount),e=nt(o=>o.totalCurrentMA);if(n===0||e==null)return null;const t=250*n,i=450*n,r=e>i?"#ef4444":e>t?"#f97316":"#22c55e",s=e>=1e3?`${(e/1e3).toFixed(2)} A`:`${Math.round(e)} mA`;return x.jsxs("div",{className:"app-status-chip",title:`Total current draw: ${e.toFixed(0)} mA · orange>${t}mA · red>${i}mA`,children:[x.jsx("svg",{width:"11",height:"17",viewBox:"0 0 11 17",fill:"none",style:{flexShrink:0},children:x.jsx("path",{d:"M6.5 1L1 9.5H5.5L4.5 16L10 7.5H5.5L6.5 1Z",fill:r})}),x.jsx("span",{style:{fontSize:13,fontWeight:700,color:r,transition:"color 0.4s",letterSpacing:"0.03em"},children:s})]})}function BR(){const n=nt(t=>t.overcurrentServos);if(!n||n.length===0)return null;const e=n.map(t=>`${t.label} ${t.type?t.type.toUpperCase()+" "+t.typeNum:""} (${Math.round(t.currentmA)}mA)`).join("  ·  ");return x.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",background:"#cc000022",border:"2px solid #cc0000",borderRadius:999,whiteSpace:"nowrap",animation:"oc-pulse 0.75s ease-in-out infinite alternate",boxShadow:"0 0 14px #cc000044"},children:[x.jsxs("svg",{width:"17",height:"17",viewBox:"0 0 13 13",fill:"none",style:{flexShrink:0},children:[x.jsx("path",{d:"M6.5 1L12 11.5H1L6.5 1Z",stroke:"#cc0000",strokeWidth:"2",fill:"#cc000022"}),x.jsx("line",{x1:"6.5",y1:"4.5",x2:"6.5",y2:"8.5",stroke:"#cc0000",strokeWidth:"1.8",strokeLinecap:"round"}),x.jsx("circle",{cx:"6.5",cy:"10.2",r:"0.9",fill:"#cc0000"})]}),x.jsx("span",{style:{fontSize:14,fontWeight:900,color:"#cc0000",letterSpacing:"0.08em",textTransform:"uppercase"},children:"Overcurrent"}),x.jsx("span",{style:{fontSize:14,fontWeight:800,color:"#cc0000",letterSpacing:"0.03em"},children:e})]})}function VR({page:n,setPage:e}){const t=nt(o=>o.connected),i=nt(o=>o.servoOnlineCount);let r,s;return t?i===0?(r="#f59e0b",s="No servos"):i<6?(r="#f59e0b",s=`${i}/6 live`):(r="#22c55e",s="All OK"):(r="#ef4444",s="Offline"),x.jsxs("header",{className:"app-header",children:[x.jsxs("div",{className:"app-header-brand",children:[x.jsx("span",{className:"app-logo",children:"TETROBOT"}),x.jsxs("span",{className:"app-logo-tagline",children:[x.jsx("span",{className:"app-logo-sub",children:"modular arms"}),x.jsx("span",{className:"app-logo-byline",children:"by nischay sai"})]})]}),x.jsx("div",{className:"app-header-sep"}),x.jsxs("nav",{className:"app-nav",children:[x.jsxs("button",{className:`app-nav-tab ${n==="sim"?"active":""}`,onClick:()=>e("sim"),children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("path",{d:"M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"7",r:"1.5",fill:"currentColor"})]}),"Simulator"]}),x.jsxs("button",{className:`app-nav-tab ${n==="servo"?"active":""}`,onClick:()=>e("servo"),children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("circle",{cx:"7",cy:"7",r:"3",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"7",r:"1",fill:"currentColor"}),x.jsx("path",{d:"M7 1V3M7 11V13M1 7H3M11 7H13M2.5 2.5L4 4M10 10L11.5 11.5M11.5 2.5L10 4M4 10L2.5 11.5",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"})]}),"Servo Control"]})]}),x.jsx("div",{className:"app-header-sep"}),x.jsx(IR,{}),x.jsx("div",{className:"app-header-space"}),x.jsxs("div",{className:"app-header-right",children:[x.jsx(BR,{}),x.jsx(kR,{}),x.jsx(zR,{}),x.jsxs("div",{className:"app-status-chip",title:`ESP32-C3: ${s}`,children:[x.jsx("span",{style:{width:10,height:10,borderRadius:"50%",display:"inline-block",flexShrink:0,background:r,boxShadow:`0 0 7px ${r}`,transition:"background 0.4s, box-shadow 0.4s"}}),x.jsx("span",{children:"ESP32-C3"}),x.jsxs("span",{style:{fontSize:12,color:r,marginLeft:2,fontWeight:700,transition:"color 0.4s"},children:["· ",s]})]}),x.jsx("div",{className:"app-status-chip app-status-chip-mono",children:"6 × ST3215"}),x.jsx(DR,{})]})]})}function HR({page:n}){return x.jsxs("footer",{className:"app-footer",children:[x.jsx("span",{className:"app-footer-brand",children:"ROBO4"}),x.jsx("span",{className:"app-footer-sep"}),x.jsx("span",{children:"Modular Arm Platform"}),x.jsx("span",{className:"app-footer-sep"}),x.jsx("span",{children:"6 × ST3215 · ESP32-C3"}),x.jsx("div",{className:"app-footer-space"}),x.jsx("span",{className:`app-footer-page-pill ${n==="sim"?"active":""}`,style:{cursor:"pointer"},children:"◈ Simulator"}),x.jsx("span",{className:`app-footer-page-pill ${n==="servo"?"active":""}`,style:{cursor:"pointer"},children:"⚙ Servo Control"})]})}const GR=200,Pg=340;function jR(){const[n,e]=te.useState("sim"),[t,i]=te.useState(!1),[r,s]=te.useState(Pg),o=eo(f=>f.theme);te.useEffect(()=>{document.documentElement.setAttribute("data-theme",o)},[o]);const a=lr(f=>f.name);te.useEffect(()=>{document.title=`TETROBOT — ${a??"untitled"}`},[a]);const l=te.useRef(Pg);l.current=r;const c=te.useCallback(f=>{if(f.button!==0)return;f.preventDefault();const h=f.clientX,p=l.current,g=Math.floor(window.innerWidth/2);document.body.style.cursor="col-resize",document.body.style.userSelect="none";const y=u=>{const _=Math.max(GR,Math.min(g,p+(u.clientX-h)));l.current=_,s(_)},m=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",y),document.removeEventListener("mouseup",m)};document.addEventListener("mousemove",y),document.addEventListener("mouseup",m)},[]),d=te.useCallback(()=>i(f=>!f),[]);return x.jsxs("div",{className:"app-shell",children:[x.jsx(VR,{page:n,setPage:e}),x.jsxs("main",{className:"app-main",children:[x.jsxs("div",{className:"app-root",style:n!=="sim"?{visibility:"hidden",pointerEvents:"none",position:"absolute",inset:0}:{},children:[x.jsx(dS,{style:{width:r}}),x.jsx("div",{className:"panel-resize-handle",onMouseDown:c}),x.jsxs("div",{className:"canvas-wrapper",children:[x.jsx(tR,{}),x.jsx(UR,{}),x.jsx(FR,{}),x.jsxs("div",{className:"top-right-cluster",children:[x.jsx(oR,{}),x.jsx(aR,{isConnOpen:t,onConnToggle:d})]}),x.jsx(nR,{})]})]}),x.jsx("div",{className:"app-servo-wrap",style:n!=="servo"?{display:"none"}:{},children:x.jsx(bR,{})})]}),x.jsx(HR,{page:n}),x.jsx(LR,{isOpen:t,onClose:()=>i(!1),children:x.jsx(NR,{})})]})}jv(document.getElementById("root")).render(x.jsx(te.StrictMode,{children:x.jsx(jR,{})}));

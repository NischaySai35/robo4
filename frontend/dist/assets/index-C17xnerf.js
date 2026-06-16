(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=n(r);fetch(r.href,s)}})();function ng(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var ig={exports:{}},Xl={},rg={exports:{}},$e={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var na=Symbol.for("react.element"),f_=Symbol.for("react.portal"),h_=Symbol.for("react.fragment"),p_=Symbol.for("react.strict_mode"),m_=Symbol.for("react.profiler"),g_=Symbol.for("react.provider"),v_=Symbol.for("react.context"),__=Symbol.for("react.forward_ref"),x_=Symbol.for("react.suspense"),y_=Symbol.for("react.memo"),S_=Symbol.for("react.lazy"),Gf=Symbol.iterator;function M_(t){return t===null||typeof t!="object"?null:(t=Gf&&t[Gf]||t["@@iterator"],typeof t=="function"?t:null)}var sg={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},og=Object.assign,ag={};function js(t,e,n){this.props=t,this.context=e,this.refs=ag,this.updater=n||sg}js.prototype.isReactComponent={};js.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};js.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function lg(){}lg.prototype=js.prototype;function Nd(t,e,n){this.props=t,this.context=e,this.refs=ag,this.updater=n||sg}var Dd=Nd.prototype=new lg;Dd.constructor=Nd;og(Dd,js.prototype);Dd.isPureReactComponent=!0;var jf=Array.isArray,cg=Object.prototype.hasOwnProperty,Id={current:null},ug={key:!0,ref:!0,__self:!0,__source:!0};function dg(t,e,n){var i,r={},s=null,o=null;if(e!=null)for(i in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(s=""+e.key),e)cg.call(e,i)&&!ug.hasOwnProperty(i)&&(r[i]=e[i]);var a=arguments.length-2;if(a===1)r.children=n;else if(1<a){for(var l=Array(a),c=0;c<a;c++)l[c]=arguments[c+2];r.children=l}if(t&&t.defaultProps)for(i in a=t.defaultProps,a)r[i]===void 0&&(r[i]=a[i]);return{$$typeof:na,type:t,key:s,ref:o,props:r,_owner:Id.current}}function E_(t,e){return{$$typeof:na,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function Ud(t){return typeof t=="object"&&t!==null&&t.$$typeof===na}function T_(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var Wf=/\/+/g;function xc(t,e){return typeof t=="object"&&t!==null&&t.key!=null?T_(""+t.key):e.toString(36)}function Qa(t,e,n,i,r){var s=typeof t;(s==="undefined"||s==="boolean")&&(t=null);var o=!1;if(t===null)o=!0;else switch(s){case"string":case"number":o=!0;break;case"object":switch(t.$$typeof){case na:case f_:o=!0}}if(o)return o=t,r=r(o),t=i===""?"."+xc(o,0):i,jf(r)?(n="",t!=null&&(n=t.replace(Wf,"$&/")+"/"),Qa(r,e,n,"",function(c){return c})):r!=null&&(Ud(r)&&(r=E_(r,n+(!r.key||o&&o.key===r.key?"":(""+r.key).replace(Wf,"$&/")+"/")+t)),e.push(r)),1;if(o=0,i=i===""?".":i+":",jf(t))for(var a=0;a<t.length;a++){s=t[a];var l=i+xc(s,a);o+=Qa(s,e,n,l,r)}else if(l=M_(t),typeof l=="function")for(t=l.call(t),a=0;!(s=t.next()).done;)s=s.value,l=i+xc(s,a++),o+=Qa(s,e,n,l,r);else if(s==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function ca(t,e,n){if(t==null)return t;var i=[],r=0;return Qa(t,i,"","",function(s){return e.call(n,s,r++)}),i}function w_(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var Jt={current:null},Ja={transition:null},A_={ReactCurrentDispatcher:Jt,ReactCurrentBatchConfig:Ja,ReactCurrentOwner:Id};function fg(){throw Error("act(...) is not supported in production builds of React.")}$e.Children={map:ca,forEach:function(t,e,n){ca(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return ca(t,function(){e++}),e},toArray:function(t){return ca(t,function(e){return e})||[]},only:function(t){if(!Ud(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};$e.Component=js;$e.Fragment=h_;$e.Profiler=m_;$e.PureComponent=Nd;$e.StrictMode=p_;$e.Suspense=x_;$e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=A_;$e.act=fg;$e.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var i=og({},t.props),r=t.key,s=t.ref,o=t._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,o=Id.current),e.key!==void 0&&(r=""+e.key),t.type&&t.type.defaultProps)var a=t.type.defaultProps;for(l in e)cg.call(e,l)&&!ug.hasOwnProperty(l)&&(i[l]=e[l]===void 0&&a!==void 0?a[l]:e[l])}var l=arguments.length-2;if(l===1)i.children=n;else if(1<l){a=Array(l);for(var c=0;c<l;c++)a[c]=arguments[c+2];i.children=a}return{$$typeof:na,type:t.type,key:r,ref:s,props:i,_owner:o}};$e.createContext=function(t){return t={$$typeof:v_,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:g_,_context:t},t.Consumer=t};$e.createElement=dg;$e.createFactory=function(t){var e=dg.bind(null,t);return e.type=t,e};$e.createRef=function(){return{current:null}};$e.forwardRef=function(t){return{$$typeof:__,render:t}};$e.isValidElement=Ud;$e.lazy=function(t){return{$$typeof:S_,_payload:{_status:-1,_result:t},_init:w_}};$e.memo=function(t,e){return{$$typeof:y_,type:t,compare:e===void 0?null:e}};$e.startTransition=function(t){var e=Ja.transition;Ja.transition={};try{t()}finally{Ja.transition=e}};$e.unstable_act=fg;$e.useCallback=function(t,e){return Jt.current.useCallback(t,e)};$e.useContext=function(t){return Jt.current.useContext(t)};$e.useDebugValue=function(){};$e.useDeferredValue=function(t){return Jt.current.useDeferredValue(t)};$e.useEffect=function(t,e){return Jt.current.useEffect(t,e)};$e.useId=function(){return Jt.current.useId()};$e.useImperativeHandle=function(t,e,n){return Jt.current.useImperativeHandle(t,e,n)};$e.useInsertionEffect=function(t,e){return Jt.current.useInsertionEffect(t,e)};$e.useLayoutEffect=function(t,e){return Jt.current.useLayoutEffect(t,e)};$e.useMemo=function(t,e){return Jt.current.useMemo(t,e)};$e.useReducer=function(t,e,n){return Jt.current.useReducer(t,e,n)};$e.useRef=function(t){return Jt.current.useRef(t)};$e.useState=function(t){return Jt.current.useState(t)};$e.useSyncExternalStore=function(t,e,n){return Jt.current.useSyncExternalStore(t,e,n)};$e.useTransition=function(){return Jt.current.useTransition()};$e.version="18.3.1";rg.exports=$e;var J=rg.exports;const C_=ng(J);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var R_=J,b_=Symbol.for("react.element"),P_=Symbol.for("react.fragment"),L_=Object.prototype.hasOwnProperty,N_=R_.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,D_={key:!0,ref:!0,__self:!0,__source:!0};function hg(t,e,n){var i,r={},s=null,o=null;n!==void 0&&(s=""+n),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(o=e.ref);for(i in e)L_.call(e,i)&&!D_.hasOwnProperty(i)&&(r[i]=e[i]);if(t&&t.defaultProps)for(i in e=t.defaultProps,e)r[i]===void 0&&(r[i]=e[i]);return{$$typeof:b_,type:t,key:s,ref:o,props:r,_owner:N_.current}}Xl.Fragment=P_;Xl.jsx=hg;Xl.jsxs=hg;ig.exports=Xl;var y=ig.exports,pg={exports:{}},xn={},mg={exports:{}},gg={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(t){function e(I,G){var X=I.length;I.push(G);e:for(;0<X;){var ee=X-1>>>1,ue=I[ee];if(0<r(ue,G))I[ee]=G,I[X]=ue,X=ee;else break e}}function n(I){return I.length===0?null:I[0]}function i(I){if(I.length===0)return null;var G=I[0],X=I.pop();if(X!==G){I[0]=X;e:for(var ee=0,ue=I.length,be=ue>>>1;ee<be;){var K=2*(ee+1)-1,ne=I[K],he=K+1,ae=I[he];if(0>r(ne,X))he<ue&&0>r(ae,ne)?(I[ee]=ae,I[he]=X,ee=he):(I[ee]=ne,I[K]=X,ee=K);else if(he<ue&&0>r(ae,X))I[ee]=ae,I[he]=X,ee=he;else break e}}return G}function r(I,G){var X=I.sortIndex-G.sortIndex;return X!==0?X:I.id-G.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;t.unstable_now=function(){return s.now()}}else{var o=Date,a=o.now();t.unstable_now=function(){return o.now()-a}}var l=[],c=[],f=1,d=null,h=3,p=!1,g=!1,x=!1,m=typeof setTimeout=="function"?setTimeout:null,u=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function _(I){for(var G=n(c);G!==null;){if(G.callback===null)i(c);else if(G.startTime<=I)i(c),G.sortIndex=G.expirationTime,e(l,G);else break;G=n(c)}}function M(I){if(x=!1,_(I),!g)if(n(l)!==null)g=!0,O(b);else{var G=n(c);G!==null&&Z(M,G.startTime-I)}}function b(I,G){g=!1,x&&(x=!1,u(L),L=-1),p=!0;var X=h;try{for(_(G),d=n(l);d!==null&&(!(d.expirationTime>G)||I&&!U());){var ee=d.callback;if(typeof ee=="function"){d.callback=null,h=d.priorityLevel;var ue=ee(d.expirationTime<=G);G=t.unstable_now(),typeof ue=="function"?d.callback=ue:d===n(l)&&i(l),_(G)}else i(l);d=n(l)}if(d!==null)var be=!0;else{var K=n(c);K!==null&&Z(M,K.startTime-G),be=!1}return be}finally{d=null,h=X,p=!1}}var C=!1,A=null,L=-1,T=5,S=-1;function U(){return!(t.unstable_now()-S<T)}function k(){if(A!==null){var I=t.unstable_now();S=I;var G=!0;try{G=A(!0,I)}finally{G?D():(C=!1,A=null)}}else C=!1}var D;if(typeof v=="function")D=function(){v(k)};else if(typeof MessageChannel<"u"){var V=new MessageChannel,z=V.port2;V.port1.onmessage=k,D=function(){z.postMessage(null)}}else D=function(){m(k,0)};function O(I){A=I,C||(C=!0,D())}function Z(I,G){L=m(function(){I(t.unstable_now())},G)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(I){I.callback=null},t.unstable_continueExecution=function(){g||p||(g=!0,O(b))},t.unstable_forceFrameRate=function(I){0>I||125<I?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):T=0<I?Math.floor(1e3/I):5},t.unstable_getCurrentPriorityLevel=function(){return h},t.unstable_getFirstCallbackNode=function(){return n(l)},t.unstable_next=function(I){switch(h){case 1:case 2:case 3:var G=3;break;default:G=h}var X=h;h=G;try{return I()}finally{h=X}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function(I,G){switch(I){case 1:case 2:case 3:case 4:case 5:break;default:I=3}var X=h;h=I;try{return G()}finally{h=X}},t.unstable_scheduleCallback=function(I,G,X){var ee=t.unstable_now();switch(typeof X=="object"&&X!==null?(X=X.delay,X=typeof X=="number"&&0<X?ee+X:ee):X=ee,I){case 1:var ue=-1;break;case 2:ue=250;break;case 5:ue=1073741823;break;case 4:ue=1e4;break;default:ue=5e3}return ue=X+ue,I={id:f++,callback:G,priorityLevel:I,startTime:X,expirationTime:ue,sortIndex:-1},X>ee?(I.sortIndex=X,e(c,I),n(l)===null&&I===n(c)&&(x?(u(L),L=-1):x=!0,Z(M,X-ee))):(I.sortIndex=ue,e(l,I),g||p||(g=!0,O(b))),I},t.unstable_shouldYield=U,t.unstable_wrapCallback=function(I){var G=h;return function(){var X=h;h=G;try{return I.apply(this,arguments)}finally{h=X}}}})(gg);mg.exports=gg;var I_=mg.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var U_=J,_n=I_;function se(t){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+t,n=1;n<arguments.length;n++)e+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+t+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var vg=new Set,Uo={};function Fr(t,e){Ls(t,e),Ls(t+"Capture",e)}function Ls(t,e){for(Uo[t]=e,t=0;t<e.length;t++)vg.add(e[t])}var Ei=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Pu=Object.prototype.hasOwnProperty,F_=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Xf={},$f={};function O_(t){return Pu.call($f,t)?!0:Pu.call(Xf,t)?!1:F_.test(t)?$f[t]=!0:(Xf[t]=!0,!1)}function k_(t,e,n,i){if(n!==null&&n.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return i?!1:n!==null?!n.acceptsBooleans:(t=t.toLowerCase().slice(0,5),t!=="data-"&&t!=="aria-");default:return!1}}function z_(t,e,n,i){if(e===null||typeof e>"u"||k_(t,e,n,i))return!0;if(i)return!1;if(n!==null)switch(n.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function en(t,e,n,i,r,s,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=i,this.attributeNamespace=r,this.mustUseProperty=n,this.propertyName=t,this.type=e,this.sanitizeURL=s,this.removeEmptyString=o}var kt={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t){kt[t]=new en(t,0,!1,t,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(t){var e=t[0];kt[e]=new en(e,1,!1,t[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(t){kt[t]=new en(t,2,!1,t.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(t){kt[t]=new en(t,2,!1,t,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t){kt[t]=new en(t,3,!1,t.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(t){kt[t]=new en(t,3,!0,t,null,!1,!1)});["capture","download"].forEach(function(t){kt[t]=new en(t,4,!1,t,null,!1,!1)});["cols","rows","size","span"].forEach(function(t){kt[t]=new en(t,6,!1,t,null,!1,!1)});["rowSpan","start"].forEach(function(t){kt[t]=new en(t,5,!1,t.toLowerCase(),null,!1,!1)});var Fd=/[\-:]([a-z])/g;function Od(t){return t[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t){var e=t.replace(Fd,Od);kt[e]=new en(e,1,!1,t,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t){var e=t.replace(Fd,Od);kt[e]=new en(e,1,!1,t,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(t){var e=t.replace(Fd,Od);kt[e]=new en(e,1,!1,t,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(t){kt[t]=new en(t,1,!1,t.toLowerCase(),null,!1,!1)});kt.xlinkHref=new en("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(t){kt[t]=new en(t,1,!1,t.toLowerCase(),null,!0,!0)});function kd(t,e,n,i){var r=kt.hasOwnProperty(e)?kt[e]:null;(r!==null?r.type!==0:i||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(z_(e,n,r,i)&&(n=null),i||r===null?O_(e)&&(n===null?t.removeAttribute(e):t.setAttribute(e,""+n)):r.mustUseProperty?t[r.propertyName]=n===null?r.type===3?!1:"":n:(e=r.attributeName,i=r.attributeNamespace,n===null?t.removeAttribute(e):(r=r.type,n=r===3||r===4&&n===!0?"":""+n,i?t.setAttributeNS(i,e,n):t.setAttribute(e,n))))}var Ci=U_.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,ua=Symbol.for("react.element"),cs=Symbol.for("react.portal"),us=Symbol.for("react.fragment"),zd=Symbol.for("react.strict_mode"),Lu=Symbol.for("react.profiler"),_g=Symbol.for("react.provider"),xg=Symbol.for("react.context"),Bd=Symbol.for("react.forward_ref"),Nu=Symbol.for("react.suspense"),Du=Symbol.for("react.suspense_list"),Hd=Symbol.for("react.memo"),ki=Symbol.for("react.lazy"),yg=Symbol.for("react.offscreen"),Yf=Symbol.iterator;function to(t){return t===null||typeof t!="object"?null:(t=Yf&&t[Yf]||t["@@iterator"],typeof t=="function"?t:null)}var mt=Object.assign,yc;function _o(t){if(yc===void 0)try{throw Error()}catch(n){var e=n.stack.trim().match(/\n( *(at )?)/);yc=e&&e[1]||""}return`
`+yc+t}var Sc=!1;function Mc(t,e){if(!t||Sc)return"";Sc=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var i=c}Reflect.construct(t,[],e)}else{try{e.call()}catch(c){i=c}t.call(e.prototype)}else{try{throw Error()}catch(c){i=c}t()}}catch(c){if(c&&i&&typeof c.stack=="string"){for(var r=c.stack.split(`
`),s=i.stack.split(`
`),o=r.length-1,a=s.length-1;1<=o&&0<=a&&r[o]!==s[a];)a--;for(;1<=o&&0<=a;o--,a--)if(r[o]!==s[a]){if(o!==1||a!==1)do if(o--,a--,0>a||r[o]!==s[a]){var l=`
`+r[o].replace(" at new "," at ");return t.displayName&&l.includes("<anonymous>")&&(l=l.replace("<anonymous>",t.displayName)),l}while(1<=o&&0<=a);break}}}finally{Sc=!1,Error.prepareStackTrace=n}return(t=t?t.displayName||t.name:"")?_o(t):""}function B_(t){switch(t.tag){case 5:return _o(t.type);case 16:return _o("Lazy");case 13:return _o("Suspense");case 19:return _o("SuspenseList");case 0:case 2:case 15:return t=Mc(t.type,!1),t;case 11:return t=Mc(t.type.render,!1),t;case 1:return t=Mc(t.type,!0),t;default:return""}}function Iu(t){if(t==null)return null;if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t;switch(t){case us:return"Fragment";case cs:return"Portal";case Lu:return"Profiler";case zd:return"StrictMode";case Nu:return"Suspense";case Du:return"SuspenseList"}if(typeof t=="object")switch(t.$$typeof){case xg:return(t.displayName||"Context")+".Consumer";case _g:return(t._context.displayName||"Context")+".Provider";case Bd:var e=t.render;return t=t.displayName,t||(t=e.displayName||e.name||"",t=t!==""?"ForwardRef("+t+")":"ForwardRef"),t;case Hd:return e=t.displayName||null,e!==null?e:Iu(t.type)||"Memo";case ki:e=t._payload,t=t._init;try{return Iu(t(e))}catch{}}return null}function H_(t){var e=t.type;switch(t.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return t=e.render,t=t.displayName||t.name||"",e.displayName||(t!==""?"ForwardRef("+t+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Iu(e);case 8:return e===zd?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function rr(t){switch(typeof t){case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function Sg(t){var e=t.type;return(t=t.nodeName)&&t.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function V_(t){var e=Sg(t)?"checked":"value",n=Object.getOwnPropertyDescriptor(t.constructor.prototype,e),i=""+t[e];if(!t.hasOwnProperty(e)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var r=n.get,s=n.set;return Object.defineProperty(t,e,{configurable:!0,get:function(){return r.call(this)},set:function(o){i=""+o,s.call(this,o)}}),Object.defineProperty(t,e,{enumerable:n.enumerable}),{getValue:function(){return i},setValue:function(o){i=""+o},stopTracking:function(){t._valueTracker=null,delete t[e]}}}}function da(t){t._valueTracker||(t._valueTracker=V_(t))}function Mg(t){if(!t)return!1;var e=t._valueTracker;if(!e)return!0;var n=e.getValue(),i="";return t&&(i=Sg(t)?t.checked?"true":"false":t.value),t=i,t!==n?(e.setValue(t),!0):!1}function fl(t){if(t=t||(typeof document<"u"?document:void 0),typeof t>"u")return null;try{return t.activeElement||t.body}catch{return t.body}}function Uu(t,e){var n=e.checked;return mt({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??t._wrapperState.initialChecked})}function qf(t,e){var n=e.defaultValue==null?"":e.defaultValue,i=e.checked!=null?e.checked:e.defaultChecked;n=rr(e.value!=null?e.value:n),t._wrapperState={initialChecked:i,initialValue:n,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function Eg(t,e){e=e.checked,e!=null&&kd(t,"checked",e,!1)}function Fu(t,e){Eg(t,e);var n=rr(e.value),i=e.type;if(n!=null)i==="number"?(n===0&&t.value===""||t.value!=n)&&(t.value=""+n):t.value!==""+n&&(t.value=""+n);else if(i==="submit"||i==="reset"){t.removeAttribute("value");return}e.hasOwnProperty("value")?Ou(t,e.type,n):e.hasOwnProperty("defaultValue")&&Ou(t,e.type,rr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(t.defaultChecked=!!e.defaultChecked)}function Kf(t,e,n){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var i=e.type;if(!(i!=="submit"&&i!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+t._wrapperState.initialValue,n||e===t.value||(t.value=e),t.defaultValue=e}n=t.name,n!==""&&(t.name=""),t.defaultChecked=!!t._wrapperState.initialChecked,n!==""&&(t.name=n)}function Ou(t,e,n){(e!=="number"||fl(t.ownerDocument)!==t)&&(n==null?t.defaultValue=""+t._wrapperState.initialValue:t.defaultValue!==""+n&&(t.defaultValue=""+n))}var xo=Array.isArray;function Ms(t,e,n,i){if(t=t.options,e){e={};for(var r=0;r<n.length;r++)e["$"+n[r]]=!0;for(n=0;n<t.length;n++)r=e.hasOwnProperty("$"+t[n].value),t[n].selected!==r&&(t[n].selected=r),r&&i&&(t[n].defaultSelected=!0)}else{for(n=""+rr(n),e=null,r=0;r<t.length;r++){if(t[r].value===n){t[r].selected=!0,i&&(t[r].defaultSelected=!0);return}e!==null||t[r].disabled||(e=t[r])}e!==null&&(e.selected=!0)}}function ku(t,e){if(e.dangerouslySetInnerHTML!=null)throw Error(se(91));return mt({},e,{value:void 0,defaultValue:void 0,children:""+t._wrapperState.initialValue})}function Zf(t,e){var n=e.value;if(n==null){if(n=e.children,e=e.defaultValue,n!=null){if(e!=null)throw Error(se(92));if(xo(n)){if(1<n.length)throw Error(se(93));n=n[0]}e=n}e==null&&(e=""),n=e}t._wrapperState={initialValue:rr(n)}}function Tg(t,e){var n=rr(e.value),i=rr(e.defaultValue);n!=null&&(n=""+n,n!==t.value&&(t.value=n),e.defaultValue==null&&t.defaultValue!==n&&(t.defaultValue=n)),i!=null&&(t.defaultValue=""+i)}function Qf(t){var e=t.textContent;e===t._wrapperState.initialValue&&e!==""&&e!==null&&(t.value=e)}function wg(t){switch(t){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function zu(t,e){return t==null||t==="http://www.w3.org/1999/xhtml"?wg(e):t==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":t}var fa,Ag=function(t){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,n,i,r){MSApp.execUnsafeLocalFunction(function(){return t(e,n,i,r)})}:t}(function(t,e){if(t.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in t)t.innerHTML=e;else{for(fa=fa||document.createElement("div"),fa.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=fa.firstChild;t.firstChild;)t.removeChild(t.firstChild);for(;e.firstChild;)t.appendChild(e.firstChild)}});function Fo(t,e){if(e){var n=t.firstChild;if(n&&n===t.lastChild&&n.nodeType===3){n.nodeValue=e;return}}t.textContent=e}var To={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},G_=["Webkit","ms","Moz","O"];Object.keys(To).forEach(function(t){G_.forEach(function(e){e=e+t.charAt(0).toUpperCase()+t.substring(1),To[e]=To[t]})});function Cg(t,e,n){return e==null||typeof e=="boolean"||e===""?"":n||typeof e!="number"||e===0||To.hasOwnProperty(t)&&To[t]?(""+e).trim():e+"px"}function Rg(t,e){t=t.style;for(var n in e)if(e.hasOwnProperty(n)){var i=n.indexOf("--")===0,r=Cg(n,e[n],i);n==="float"&&(n="cssFloat"),i?t.setProperty(n,r):t[n]=r}}var j_=mt({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Bu(t,e){if(e){if(j_[t]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(se(137,t));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(se(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(se(61))}if(e.style!=null&&typeof e.style!="object")throw Error(se(62))}}function Hu(t,e){if(t.indexOf("-")===-1)return typeof e.is=="string";switch(t){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Vu=null;function Vd(t){return t=t.target||t.srcElement||window,t.correspondingUseElement&&(t=t.correspondingUseElement),t.nodeType===3?t.parentNode:t}var Gu=null,Es=null,Ts=null;function Jf(t){if(t=sa(t)){if(typeof Gu!="function")throw Error(se(280));var e=t.stateNode;e&&(e=Zl(e),Gu(t.stateNode,t.type,e))}}function bg(t){Es?Ts?Ts.push(t):Ts=[t]:Es=t}function Pg(){if(Es){var t=Es,e=Ts;if(Ts=Es=null,Jf(t),e)for(t=0;t<e.length;t++)Jf(e[t])}}function Lg(t,e){return t(e)}function Ng(){}var Ec=!1;function Dg(t,e,n){if(Ec)return t(e,n);Ec=!0;try{return Lg(t,e,n)}finally{Ec=!1,(Es!==null||Ts!==null)&&(Ng(),Pg())}}function Oo(t,e){var n=t.stateNode;if(n===null)return null;var i=Zl(n);if(i===null)return null;n=i[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(t=t.type,i=!(t==="button"||t==="input"||t==="select"||t==="textarea")),t=!i;break e;default:t=!1}if(t)return null;if(n&&typeof n!="function")throw Error(se(231,e,typeof n));return n}var ju=!1;if(Ei)try{var no={};Object.defineProperty(no,"passive",{get:function(){ju=!0}}),window.addEventListener("test",no,no),window.removeEventListener("test",no,no)}catch{ju=!1}function W_(t,e,n,i,r,s,o,a,l){var c=Array.prototype.slice.call(arguments,3);try{e.apply(n,c)}catch(f){this.onError(f)}}var wo=!1,hl=null,pl=!1,Wu=null,X_={onError:function(t){wo=!0,hl=t}};function $_(t,e,n,i,r,s,o,a,l){wo=!1,hl=null,W_.apply(X_,arguments)}function Y_(t,e,n,i,r,s,o,a,l){if($_.apply(this,arguments),wo){if(wo){var c=hl;wo=!1,hl=null}else throw Error(se(198));pl||(pl=!0,Wu=c)}}function Or(t){var e=t,n=t;if(t.alternate)for(;e.return;)e=e.return;else{t=e;do e=t,e.flags&4098&&(n=e.return),t=e.return;while(t)}return e.tag===3?n:null}function Ig(t){if(t.tag===13){var e=t.memoizedState;if(e===null&&(t=t.alternate,t!==null&&(e=t.memoizedState)),e!==null)return e.dehydrated}return null}function eh(t){if(Or(t)!==t)throw Error(se(188))}function q_(t){var e=t.alternate;if(!e){if(e=Or(t),e===null)throw Error(se(188));return e!==t?null:t}for(var n=t,i=e;;){var r=n.return;if(r===null)break;var s=r.alternate;if(s===null){if(i=r.return,i!==null){n=i;continue}break}if(r.child===s.child){for(s=r.child;s;){if(s===n)return eh(r),t;if(s===i)return eh(r),e;s=s.sibling}throw Error(se(188))}if(n.return!==i.return)n=r,i=s;else{for(var o=!1,a=r.child;a;){if(a===n){o=!0,n=r,i=s;break}if(a===i){o=!0,i=r,n=s;break}a=a.sibling}if(!o){for(a=s.child;a;){if(a===n){o=!0,n=s,i=r;break}if(a===i){o=!0,i=s,n=r;break}a=a.sibling}if(!o)throw Error(se(189))}}if(n.alternate!==i)throw Error(se(190))}if(n.tag!==3)throw Error(se(188));return n.stateNode.current===n?t:e}function Ug(t){return t=q_(t),t!==null?Fg(t):null}function Fg(t){if(t.tag===5||t.tag===6)return t;for(t=t.child;t!==null;){var e=Fg(t);if(e!==null)return e;t=t.sibling}return null}var Og=_n.unstable_scheduleCallback,th=_n.unstable_cancelCallback,K_=_n.unstable_shouldYield,Z_=_n.unstable_requestPaint,xt=_n.unstable_now,Q_=_n.unstable_getCurrentPriorityLevel,Gd=_n.unstable_ImmediatePriority,kg=_n.unstable_UserBlockingPriority,ml=_n.unstable_NormalPriority,J_=_n.unstable_LowPriority,zg=_n.unstable_IdlePriority,$l=null,ni=null;function ex(t){if(ni&&typeof ni.onCommitFiberRoot=="function")try{ni.onCommitFiberRoot($l,t,void 0,(t.current.flags&128)===128)}catch{}}var Wn=Math.clz32?Math.clz32:ix,tx=Math.log,nx=Math.LN2;function ix(t){return t>>>=0,t===0?32:31-(tx(t)/nx|0)|0}var ha=64,pa=4194304;function yo(t){switch(t&-t){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return t&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return t}}function gl(t,e){var n=t.pendingLanes;if(n===0)return 0;var i=0,r=t.suspendedLanes,s=t.pingedLanes,o=n&268435455;if(o!==0){var a=o&~r;a!==0?i=yo(a):(s&=o,s!==0&&(i=yo(s)))}else o=n&~r,o!==0?i=yo(o):s!==0&&(i=yo(s));if(i===0)return 0;if(e!==0&&e!==i&&!(e&r)&&(r=i&-i,s=e&-e,r>=s||r===16&&(s&4194240)!==0))return e;if(i&4&&(i|=n&16),e=t.entangledLanes,e!==0)for(t=t.entanglements,e&=i;0<e;)n=31-Wn(e),r=1<<n,i|=t[n],e&=~r;return i}function rx(t,e){switch(t){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function sx(t,e){for(var n=t.suspendedLanes,i=t.pingedLanes,r=t.expirationTimes,s=t.pendingLanes;0<s;){var o=31-Wn(s),a=1<<o,l=r[o];l===-1?(!(a&n)||a&i)&&(r[o]=rx(a,e)):l<=e&&(t.expiredLanes|=a),s&=~a}}function Xu(t){return t=t.pendingLanes&-1073741825,t!==0?t:t&1073741824?1073741824:0}function Bg(){var t=ha;return ha<<=1,!(ha&4194240)&&(ha=64),t}function Tc(t){for(var e=[],n=0;31>n;n++)e.push(t);return e}function ia(t,e,n){t.pendingLanes|=e,e!==536870912&&(t.suspendedLanes=0,t.pingedLanes=0),t=t.eventTimes,e=31-Wn(e),t[e]=n}function ox(t,e){var n=t.pendingLanes&~e;t.pendingLanes=e,t.suspendedLanes=0,t.pingedLanes=0,t.expiredLanes&=e,t.mutableReadLanes&=e,t.entangledLanes&=e,e=t.entanglements;var i=t.eventTimes;for(t=t.expirationTimes;0<n;){var r=31-Wn(n),s=1<<r;e[r]=0,i[r]=-1,t[r]=-1,n&=~s}}function jd(t,e){var n=t.entangledLanes|=e;for(t=t.entanglements;n;){var i=31-Wn(n),r=1<<i;r&e|t[i]&e&&(t[i]|=e),n&=~r}}var nt=0;function Hg(t){return t&=-t,1<t?4<t?t&268435455?16:536870912:4:1}var Vg,Wd,Gg,jg,Wg,$u=!1,ma=[],Yi=null,qi=null,Ki=null,ko=new Map,zo=new Map,Hi=[],ax="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function nh(t,e){switch(t){case"focusin":case"focusout":Yi=null;break;case"dragenter":case"dragleave":qi=null;break;case"mouseover":case"mouseout":Ki=null;break;case"pointerover":case"pointerout":ko.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":zo.delete(e.pointerId)}}function io(t,e,n,i,r,s){return t===null||t.nativeEvent!==s?(t={blockedOn:e,domEventName:n,eventSystemFlags:i,nativeEvent:s,targetContainers:[r]},e!==null&&(e=sa(e),e!==null&&Wd(e)),t):(t.eventSystemFlags|=i,e=t.targetContainers,r!==null&&e.indexOf(r)===-1&&e.push(r),t)}function lx(t,e,n,i,r){switch(e){case"focusin":return Yi=io(Yi,t,e,n,i,r),!0;case"dragenter":return qi=io(qi,t,e,n,i,r),!0;case"mouseover":return Ki=io(Ki,t,e,n,i,r),!0;case"pointerover":var s=r.pointerId;return ko.set(s,io(ko.get(s)||null,t,e,n,i,r)),!0;case"gotpointercapture":return s=r.pointerId,zo.set(s,io(zo.get(s)||null,t,e,n,i,r)),!0}return!1}function Xg(t){var e=Tr(t.target);if(e!==null){var n=Or(e);if(n!==null){if(e=n.tag,e===13){if(e=Ig(n),e!==null){t.blockedOn=e,Wg(t.priority,function(){Gg(n)});return}}else if(e===3&&n.stateNode.current.memoizedState.isDehydrated){t.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}t.blockedOn=null}function el(t){if(t.blockedOn!==null)return!1;for(var e=t.targetContainers;0<e.length;){var n=Yu(t.domEventName,t.eventSystemFlags,e[0],t.nativeEvent);if(n===null){n=t.nativeEvent;var i=new n.constructor(n.type,n);Vu=i,n.target.dispatchEvent(i),Vu=null}else return e=sa(n),e!==null&&Wd(e),t.blockedOn=n,!1;e.shift()}return!0}function ih(t,e,n){el(t)&&n.delete(e)}function cx(){$u=!1,Yi!==null&&el(Yi)&&(Yi=null),qi!==null&&el(qi)&&(qi=null),Ki!==null&&el(Ki)&&(Ki=null),ko.forEach(ih),zo.forEach(ih)}function ro(t,e){t.blockedOn===e&&(t.blockedOn=null,$u||($u=!0,_n.unstable_scheduleCallback(_n.unstable_NormalPriority,cx)))}function Bo(t){function e(r){return ro(r,t)}if(0<ma.length){ro(ma[0],t);for(var n=1;n<ma.length;n++){var i=ma[n];i.blockedOn===t&&(i.blockedOn=null)}}for(Yi!==null&&ro(Yi,t),qi!==null&&ro(qi,t),Ki!==null&&ro(Ki,t),ko.forEach(e),zo.forEach(e),n=0;n<Hi.length;n++)i=Hi[n],i.blockedOn===t&&(i.blockedOn=null);for(;0<Hi.length&&(n=Hi[0],n.blockedOn===null);)Xg(n),n.blockedOn===null&&Hi.shift()}var ws=Ci.ReactCurrentBatchConfig,vl=!0;function ux(t,e,n,i){var r=nt,s=ws.transition;ws.transition=null;try{nt=1,Xd(t,e,n,i)}finally{nt=r,ws.transition=s}}function dx(t,e,n,i){var r=nt,s=ws.transition;ws.transition=null;try{nt=4,Xd(t,e,n,i)}finally{nt=r,ws.transition=s}}function Xd(t,e,n,i){if(vl){var r=Yu(t,e,n,i);if(r===null)Ic(t,e,i,_l,n),nh(t,i);else if(lx(r,t,e,n,i))i.stopPropagation();else if(nh(t,i),e&4&&-1<ax.indexOf(t)){for(;r!==null;){var s=sa(r);if(s!==null&&Vg(s),s=Yu(t,e,n,i),s===null&&Ic(t,e,i,_l,n),s===r)break;r=s}r!==null&&i.stopPropagation()}else Ic(t,e,i,null,n)}}var _l=null;function Yu(t,e,n,i){if(_l=null,t=Vd(i),t=Tr(t),t!==null)if(e=Or(t),e===null)t=null;else if(n=e.tag,n===13){if(t=Ig(e),t!==null)return t;t=null}else if(n===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;t=null}else e!==t&&(t=null);return _l=t,null}function $g(t){switch(t){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Q_()){case Gd:return 1;case kg:return 4;case ml:case J_:return 16;case zg:return 536870912;default:return 16}default:return 16}}var ji=null,$d=null,tl=null;function Yg(){if(tl)return tl;var t,e=$d,n=e.length,i,r="value"in ji?ji.value:ji.textContent,s=r.length;for(t=0;t<n&&e[t]===r[t];t++);var o=n-t;for(i=1;i<=o&&e[n-i]===r[s-i];i++);return tl=r.slice(t,1<i?1-i:void 0)}function nl(t){var e=t.keyCode;return"charCode"in t?(t=t.charCode,t===0&&e===13&&(t=13)):t=e,t===10&&(t=13),32<=t||t===13?t:0}function ga(){return!0}function rh(){return!1}function yn(t){function e(n,i,r,s,o){this._reactName=n,this._targetInst=r,this.type=i,this.nativeEvent=s,this.target=o,this.currentTarget=null;for(var a in t)t.hasOwnProperty(a)&&(n=t[a],this[a]=n?n(s):s[a]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?ga:rh,this.isPropagationStopped=rh,this}return mt(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=ga)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=ga)},persist:function(){},isPersistent:ga}),e}var Ws={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(t){return t.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Yd=yn(Ws),ra=mt({},Ws,{view:0,detail:0}),fx=yn(ra),wc,Ac,so,Yl=mt({},ra,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:qd,button:0,buttons:0,relatedTarget:function(t){return t.relatedTarget===void 0?t.fromElement===t.srcElement?t.toElement:t.fromElement:t.relatedTarget},movementX:function(t){return"movementX"in t?t.movementX:(t!==so&&(so&&t.type==="mousemove"?(wc=t.screenX-so.screenX,Ac=t.screenY-so.screenY):Ac=wc=0,so=t),wc)},movementY:function(t){return"movementY"in t?t.movementY:Ac}}),sh=yn(Yl),hx=mt({},Yl,{dataTransfer:0}),px=yn(hx),mx=mt({},ra,{relatedTarget:0}),Cc=yn(mx),gx=mt({},Ws,{animationName:0,elapsedTime:0,pseudoElement:0}),vx=yn(gx),_x=mt({},Ws,{clipboardData:function(t){return"clipboardData"in t?t.clipboardData:window.clipboardData}}),xx=yn(_x),yx=mt({},Ws,{data:0}),oh=yn(yx),Sx={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Mx={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Ex={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Tx(t){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(t):(t=Ex[t])?!!e[t]:!1}function qd(){return Tx}var wx=mt({},ra,{key:function(t){if(t.key){var e=Sx[t.key]||t.key;if(e!=="Unidentified")return e}return t.type==="keypress"?(t=nl(t),t===13?"Enter":String.fromCharCode(t)):t.type==="keydown"||t.type==="keyup"?Mx[t.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:qd,charCode:function(t){return t.type==="keypress"?nl(t):0},keyCode:function(t){return t.type==="keydown"||t.type==="keyup"?t.keyCode:0},which:function(t){return t.type==="keypress"?nl(t):t.type==="keydown"||t.type==="keyup"?t.keyCode:0}}),Ax=yn(wx),Cx=mt({},Yl,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),ah=yn(Cx),Rx=mt({},ra,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:qd}),bx=yn(Rx),Px=mt({},Ws,{propertyName:0,elapsedTime:0,pseudoElement:0}),Lx=yn(Px),Nx=mt({},Yl,{deltaX:function(t){return"deltaX"in t?t.deltaX:"wheelDeltaX"in t?-t.wheelDeltaX:0},deltaY:function(t){return"deltaY"in t?t.deltaY:"wheelDeltaY"in t?-t.wheelDeltaY:"wheelDelta"in t?-t.wheelDelta:0},deltaZ:0,deltaMode:0}),Dx=yn(Nx),Ix=[9,13,27,32],Kd=Ei&&"CompositionEvent"in window,Ao=null;Ei&&"documentMode"in document&&(Ao=document.documentMode);var Ux=Ei&&"TextEvent"in window&&!Ao,qg=Ei&&(!Kd||Ao&&8<Ao&&11>=Ao),lh=" ",ch=!1;function Kg(t,e){switch(t){case"keyup":return Ix.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Zg(t){return t=t.detail,typeof t=="object"&&"data"in t?t.data:null}var ds=!1;function Fx(t,e){switch(t){case"compositionend":return Zg(e);case"keypress":return e.which!==32?null:(ch=!0,lh);case"textInput":return t=e.data,t===lh&&ch?null:t;default:return null}}function Ox(t,e){if(ds)return t==="compositionend"||!Kd&&Kg(t,e)?(t=Yg(),tl=$d=ji=null,ds=!1,t):null;switch(t){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return qg&&e.locale!=="ko"?null:e.data;default:return null}}var kx={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function uh(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e==="input"?!!kx[t.type]:e==="textarea"}function Qg(t,e,n,i){bg(i),e=xl(e,"onChange"),0<e.length&&(n=new Yd("onChange","change",null,n,i),t.push({event:n,listeners:e}))}var Co=null,Ho=null;function zx(t){c0(t,0)}function ql(t){var e=ps(t);if(Mg(e))return t}function Bx(t,e){if(t==="change")return e}var Jg=!1;if(Ei){var Rc;if(Ei){var bc="oninput"in document;if(!bc){var dh=document.createElement("div");dh.setAttribute("oninput","return;"),bc=typeof dh.oninput=="function"}Rc=bc}else Rc=!1;Jg=Rc&&(!document.documentMode||9<document.documentMode)}function fh(){Co&&(Co.detachEvent("onpropertychange",e0),Ho=Co=null)}function e0(t){if(t.propertyName==="value"&&ql(Ho)){var e=[];Qg(e,Ho,t,Vd(t)),Dg(zx,e)}}function Hx(t,e,n){t==="focusin"?(fh(),Co=e,Ho=n,Co.attachEvent("onpropertychange",e0)):t==="focusout"&&fh()}function Vx(t){if(t==="selectionchange"||t==="keyup"||t==="keydown")return ql(Ho)}function Gx(t,e){if(t==="click")return ql(e)}function jx(t,e){if(t==="input"||t==="change")return ql(e)}function Wx(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Yn=typeof Object.is=="function"?Object.is:Wx;function Vo(t,e){if(Yn(t,e))return!0;if(typeof t!="object"||t===null||typeof e!="object"||e===null)return!1;var n=Object.keys(t),i=Object.keys(e);if(n.length!==i.length)return!1;for(i=0;i<n.length;i++){var r=n[i];if(!Pu.call(e,r)||!Yn(t[r],e[r]))return!1}return!0}function hh(t){for(;t&&t.firstChild;)t=t.firstChild;return t}function ph(t,e){var n=hh(t);t=0;for(var i;n;){if(n.nodeType===3){if(i=t+n.textContent.length,t<=e&&i>=e)return{node:n,offset:e-t};t=i}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=hh(n)}}function t0(t,e){return t&&e?t===e?!0:t&&t.nodeType===3?!1:e&&e.nodeType===3?t0(t,e.parentNode):"contains"in t?t.contains(e):t.compareDocumentPosition?!!(t.compareDocumentPosition(e)&16):!1:!1}function n0(){for(var t=window,e=fl();e instanceof t.HTMLIFrameElement;){try{var n=typeof e.contentWindow.location.href=="string"}catch{n=!1}if(n)t=e.contentWindow;else break;e=fl(t.document)}return e}function Zd(t){var e=t&&t.nodeName&&t.nodeName.toLowerCase();return e&&(e==="input"&&(t.type==="text"||t.type==="search"||t.type==="tel"||t.type==="url"||t.type==="password")||e==="textarea"||t.contentEditable==="true")}function Xx(t){var e=n0(),n=t.focusedElem,i=t.selectionRange;if(e!==n&&n&&n.ownerDocument&&t0(n.ownerDocument.documentElement,n)){if(i!==null&&Zd(n)){if(e=i.start,t=i.end,t===void 0&&(t=e),"selectionStart"in n)n.selectionStart=e,n.selectionEnd=Math.min(t,n.value.length);else if(t=(e=n.ownerDocument||document)&&e.defaultView||window,t.getSelection){t=t.getSelection();var r=n.textContent.length,s=Math.min(i.start,r);i=i.end===void 0?s:Math.min(i.end,r),!t.extend&&s>i&&(r=i,i=s,s=r),r=ph(n,s);var o=ph(n,i);r&&o&&(t.rangeCount!==1||t.anchorNode!==r.node||t.anchorOffset!==r.offset||t.focusNode!==o.node||t.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(r.node,r.offset),t.removeAllRanges(),s>i?(t.addRange(e),t.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),t.addRange(e)))}}for(e=[],t=n;t=t.parentNode;)t.nodeType===1&&e.push({element:t,left:t.scrollLeft,top:t.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<e.length;n++)t=e[n],t.element.scrollLeft=t.left,t.element.scrollTop=t.top}}var $x=Ei&&"documentMode"in document&&11>=document.documentMode,fs=null,qu=null,Ro=null,Ku=!1;function mh(t,e,n){var i=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Ku||fs==null||fs!==fl(i)||(i=fs,"selectionStart"in i&&Zd(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),Ro&&Vo(Ro,i)||(Ro=i,i=xl(qu,"onSelect"),0<i.length&&(e=new Yd("onSelect","select",null,e,n),t.push({event:e,listeners:i}),e.target=fs)))}function va(t,e){var n={};return n[t.toLowerCase()]=e.toLowerCase(),n["Webkit"+t]="webkit"+e,n["Moz"+t]="moz"+e,n}var hs={animationend:va("Animation","AnimationEnd"),animationiteration:va("Animation","AnimationIteration"),animationstart:va("Animation","AnimationStart"),transitionend:va("Transition","TransitionEnd")},Pc={},i0={};Ei&&(i0=document.createElement("div").style,"AnimationEvent"in window||(delete hs.animationend.animation,delete hs.animationiteration.animation,delete hs.animationstart.animation),"TransitionEvent"in window||delete hs.transitionend.transition);function Kl(t){if(Pc[t])return Pc[t];if(!hs[t])return t;var e=hs[t],n;for(n in e)if(e.hasOwnProperty(n)&&n in i0)return Pc[t]=e[n];return t}var r0=Kl("animationend"),s0=Kl("animationiteration"),o0=Kl("animationstart"),a0=Kl("transitionend"),l0=new Map,gh="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function lr(t,e){l0.set(t,e),Fr(e,[t])}for(var Lc=0;Lc<gh.length;Lc++){var Nc=gh[Lc],Yx=Nc.toLowerCase(),qx=Nc[0].toUpperCase()+Nc.slice(1);lr(Yx,"on"+qx)}lr(r0,"onAnimationEnd");lr(s0,"onAnimationIteration");lr(o0,"onAnimationStart");lr("dblclick","onDoubleClick");lr("focusin","onFocus");lr("focusout","onBlur");lr(a0,"onTransitionEnd");Ls("onMouseEnter",["mouseout","mouseover"]);Ls("onMouseLeave",["mouseout","mouseover"]);Ls("onPointerEnter",["pointerout","pointerover"]);Ls("onPointerLeave",["pointerout","pointerover"]);Fr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Fr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Fr("onBeforeInput",["compositionend","keypress","textInput","paste"]);Fr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Fr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Fr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var So="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Kx=new Set("cancel close invalid load scroll toggle".split(" ").concat(So));function vh(t,e,n){var i=t.type||"unknown-event";t.currentTarget=n,Y_(i,e,void 0,t),t.currentTarget=null}function c0(t,e){e=(e&4)!==0;for(var n=0;n<t.length;n++){var i=t[n],r=i.event;i=i.listeners;e:{var s=void 0;if(e)for(var o=i.length-1;0<=o;o--){var a=i[o],l=a.instance,c=a.currentTarget;if(a=a.listener,l!==s&&r.isPropagationStopped())break e;vh(r,a,c),s=l}else for(o=0;o<i.length;o++){if(a=i[o],l=a.instance,c=a.currentTarget,a=a.listener,l!==s&&r.isPropagationStopped())break e;vh(r,a,c),s=l}}}if(pl)throw t=Wu,pl=!1,Wu=null,t}function lt(t,e){var n=e[td];n===void 0&&(n=e[td]=new Set);var i=t+"__bubble";n.has(i)||(u0(e,t,2,!1),n.add(i))}function Dc(t,e,n){var i=0;e&&(i|=4),u0(n,t,i,e)}var _a="_reactListening"+Math.random().toString(36).slice(2);function Go(t){if(!t[_a]){t[_a]=!0,vg.forEach(function(n){n!=="selectionchange"&&(Kx.has(n)||Dc(n,!1,t),Dc(n,!0,t))});var e=t.nodeType===9?t:t.ownerDocument;e===null||e[_a]||(e[_a]=!0,Dc("selectionchange",!1,e))}}function u0(t,e,n,i){switch($g(e)){case 1:var r=ux;break;case 4:r=dx;break;default:r=Xd}n=r.bind(null,e,n,t),r=void 0,!ju||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(r=!0),i?r!==void 0?t.addEventListener(e,n,{capture:!0,passive:r}):t.addEventListener(e,n,!0):r!==void 0?t.addEventListener(e,n,{passive:r}):t.addEventListener(e,n,!1)}function Ic(t,e,n,i,r){var s=i;if(!(e&1)&&!(e&2)&&i!==null)e:for(;;){if(i===null)return;var o=i.tag;if(o===3||o===4){var a=i.stateNode.containerInfo;if(a===r||a.nodeType===8&&a.parentNode===r)break;if(o===4)for(o=i.return;o!==null;){var l=o.tag;if((l===3||l===4)&&(l=o.stateNode.containerInfo,l===r||l.nodeType===8&&l.parentNode===r))return;o=o.return}for(;a!==null;){if(o=Tr(a),o===null)return;if(l=o.tag,l===5||l===6){i=s=o;continue e}a=a.parentNode}}i=i.return}Dg(function(){var c=s,f=Vd(n),d=[];e:{var h=l0.get(t);if(h!==void 0){var p=Yd,g=t;switch(t){case"keypress":if(nl(n)===0)break e;case"keydown":case"keyup":p=Ax;break;case"focusin":g="focus",p=Cc;break;case"focusout":g="blur",p=Cc;break;case"beforeblur":case"afterblur":p=Cc;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":p=sh;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":p=px;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":p=bx;break;case r0:case s0:case o0:p=vx;break;case a0:p=Lx;break;case"scroll":p=fx;break;case"wheel":p=Dx;break;case"copy":case"cut":case"paste":p=xx;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":p=ah}var x=(e&4)!==0,m=!x&&t==="scroll",u=x?h!==null?h+"Capture":null:h;x=[];for(var v=c,_;v!==null;){_=v;var M=_.stateNode;if(_.tag===5&&M!==null&&(_=M,u!==null&&(M=Oo(v,u),M!=null&&x.push(jo(v,M,_)))),m)break;v=v.return}0<x.length&&(h=new p(h,g,null,n,f),d.push({event:h,listeners:x}))}}if(!(e&7)){e:{if(h=t==="mouseover"||t==="pointerover",p=t==="mouseout"||t==="pointerout",h&&n!==Vu&&(g=n.relatedTarget||n.fromElement)&&(Tr(g)||g[Ti]))break e;if((p||h)&&(h=f.window===f?f:(h=f.ownerDocument)?h.defaultView||h.parentWindow:window,p?(g=n.relatedTarget||n.toElement,p=c,g=g?Tr(g):null,g!==null&&(m=Or(g),g!==m||g.tag!==5&&g.tag!==6)&&(g=null)):(p=null,g=c),p!==g)){if(x=sh,M="onMouseLeave",u="onMouseEnter",v="mouse",(t==="pointerout"||t==="pointerover")&&(x=ah,M="onPointerLeave",u="onPointerEnter",v="pointer"),m=p==null?h:ps(p),_=g==null?h:ps(g),h=new x(M,v+"leave",p,n,f),h.target=m,h.relatedTarget=_,M=null,Tr(f)===c&&(x=new x(u,v+"enter",g,n,f),x.target=_,x.relatedTarget=m,M=x),m=M,p&&g)t:{for(x=p,u=g,v=0,_=x;_;_=Br(_))v++;for(_=0,M=u;M;M=Br(M))_++;for(;0<v-_;)x=Br(x),v--;for(;0<_-v;)u=Br(u),_--;for(;v--;){if(x===u||u!==null&&x===u.alternate)break t;x=Br(x),u=Br(u)}x=null}else x=null;p!==null&&_h(d,h,p,x,!1),g!==null&&m!==null&&_h(d,m,g,x,!0)}}e:{if(h=c?ps(c):window,p=h.nodeName&&h.nodeName.toLowerCase(),p==="select"||p==="input"&&h.type==="file")var b=Bx;else if(uh(h))if(Jg)b=jx;else{b=Vx;var C=Hx}else(p=h.nodeName)&&p.toLowerCase()==="input"&&(h.type==="checkbox"||h.type==="radio")&&(b=Gx);if(b&&(b=b(t,c))){Qg(d,b,n,f);break e}C&&C(t,h,c),t==="focusout"&&(C=h._wrapperState)&&C.controlled&&h.type==="number"&&Ou(h,"number",h.value)}switch(C=c?ps(c):window,t){case"focusin":(uh(C)||C.contentEditable==="true")&&(fs=C,qu=c,Ro=null);break;case"focusout":Ro=qu=fs=null;break;case"mousedown":Ku=!0;break;case"contextmenu":case"mouseup":case"dragend":Ku=!1,mh(d,n,f);break;case"selectionchange":if($x)break;case"keydown":case"keyup":mh(d,n,f)}var A;if(Kd)e:{switch(t){case"compositionstart":var L="onCompositionStart";break e;case"compositionend":L="onCompositionEnd";break e;case"compositionupdate":L="onCompositionUpdate";break e}L=void 0}else ds?Kg(t,n)&&(L="onCompositionEnd"):t==="keydown"&&n.keyCode===229&&(L="onCompositionStart");L&&(qg&&n.locale!=="ko"&&(ds||L!=="onCompositionStart"?L==="onCompositionEnd"&&ds&&(A=Yg()):(ji=f,$d="value"in ji?ji.value:ji.textContent,ds=!0)),C=xl(c,L),0<C.length&&(L=new oh(L,t,null,n,f),d.push({event:L,listeners:C}),A?L.data=A:(A=Zg(n),A!==null&&(L.data=A)))),(A=Ux?Fx(t,n):Ox(t,n))&&(c=xl(c,"onBeforeInput"),0<c.length&&(f=new oh("onBeforeInput","beforeinput",null,n,f),d.push({event:f,listeners:c}),f.data=A))}c0(d,e)})}function jo(t,e,n){return{instance:t,listener:e,currentTarget:n}}function xl(t,e){for(var n=e+"Capture",i=[];t!==null;){var r=t,s=r.stateNode;r.tag===5&&s!==null&&(r=s,s=Oo(t,n),s!=null&&i.unshift(jo(t,s,r)),s=Oo(t,e),s!=null&&i.push(jo(t,s,r))),t=t.return}return i}function Br(t){if(t===null)return null;do t=t.return;while(t&&t.tag!==5);return t||null}function _h(t,e,n,i,r){for(var s=e._reactName,o=[];n!==null&&n!==i;){var a=n,l=a.alternate,c=a.stateNode;if(l!==null&&l===i)break;a.tag===5&&c!==null&&(a=c,r?(l=Oo(n,s),l!=null&&o.unshift(jo(n,l,a))):r||(l=Oo(n,s),l!=null&&o.push(jo(n,l,a)))),n=n.return}o.length!==0&&t.push({event:e,listeners:o})}var Zx=/\r\n?/g,Qx=/\u0000|\uFFFD/g;function xh(t){return(typeof t=="string"?t:""+t).replace(Zx,`
`).replace(Qx,"")}function xa(t,e,n){if(e=xh(e),xh(t)!==e&&n)throw Error(se(425))}function yl(){}var Zu=null,Qu=null;function Ju(t,e){return t==="textarea"||t==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var ed=typeof setTimeout=="function"?setTimeout:void 0,Jx=typeof clearTimeout=="function"?clearTimeout:void 0,yh=typeof Promise=="function"?Promise:void 0,ey=typeof queueMicrotask=="function"?queueMicrotask:typeof yh<"u"?function(t){return yh.resolve(null).then(t).catch(ty)}:ed;function ty(t){setTimeout(function(){throw t})}function Uc(t,e){var n=e,i=0;do{var r=n.nextSibling;if(t.removeChild(n),r&&r.nodeType===8)if(n=r.data,n==="/$"){if(i===0){t.removeChild(r),Bo(e);return}i--}else n!=="$"&&n!=="$?"&&n!=="$!"||i++;n=r}while(n);Bo(e)}function Zi(t){for(;t!=null;t=t.nextSibling){var e=t.nodeType;if(e===1||e===3)break;if(e===8){if(e=t.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return t}function Sh(t){t=t.previousSibling;for(var e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="$"||n==="$!"||n==="$?"){if(e===0)return t;e--}else n==="/$"&&e++}t=t.previousSibling}return null}var Xs=Math.random().toString(36).slice(2),Qn="__reactFiber$"+Xs,Wo="__reactProps$"+Xs,Ti="__reactContainer$"+Xs,td="__reactEvents$"+Xs,ny="__reactListeners$"+Xs,iy="__reactHandles$"+Xs;function Tr(t){var e=t[Qn];if(e)return e;for(var n=t.parentNode;n;){if(e=n[Ti]||n[Qn]){if(n=e.alternate,e.child!==null||n!==null&&n.child!==null)for(t=Sh(t);t!==null;){if(n=t[Qn])return n;t=Sh(t)}return e}t=n,n=t.parentNode}return null}function sa(t){return t=t[Qn]||t[Ti],!t||t.tag!==5&&t.tag!==6&&t.tag!==13&&t.tag!==3?null:t}function ps(t){if(t.tag===5||t.tag===6)return t.stateNode;throw Error(se(33))}function Zl(t){return t[Wo]||null}var nd=[],ms=-1;function cr(t){return{current:t}}function ct(t){0>ms||(t.current=nd[ms],nd[ms]=null,ms--)}function st(t,e){ms++,nd[ms]=t.current,t.current=e}var sr={},$t=cr(sr),sn=cr(!1),Lr=sr;function Ns(t,e){var n=t.type.contextTypes;if(!n)return sr;var i=t.stateNode;if(i&&i.__reactInternalMemoizedUnmaskedChildContext===e)return i.__reactInternalMemoizedMaskedChildContext;var r={},s;for(s in n)r[s]=e[s];return i&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=e,t.__reactInternalMemoizedMaskedChildContext=r),r}function on(t){return t=t.childContextTypes,t!=null}function Sl(){ct(sn),ct($t)}function Mh(t,e,n){if($t.current!==sr)throw Error(se(168));st($t,e),st(sn,n)}function d0(t,e,n){var i=t.stateNode;if(e=e.childContextTypes,typeof i.getChildContext!="function")return n;i=i.getChildContext();for(var r in i)if(!(r in e))throw Error(se(108,H_(t)||"Unknown",r));return mt({},n,i)}function Ml(t){return t=(t=t.stateNode)&&t.__reactInternalMemoizedMergedChildContext||sr,Lr=$t.current,st($t,t),st(sn,sn.current),!0}function Eh(t,e,n){var i=t.stateNode;if(!i)throw Error(se(169));n?(t=d0(t,e,Lr),i.__reactInternalMemoizedMergedChildContext=t,ct(sn),ct($t),st($t,t)):ct(sn),st(sn,n)}var gi=null,Ql=!1,Fc=!1;function f0(t){gi===null?gi=[t]:gi.push(t)}function ry(t){Ql=!0,f0(t)}function ur(){if(!Fc&&gi!==null){Fc=!0;var t=0,e=nt;try{var n=gi;for(nt=1;t<n.length;t++){var i=n[t];do i=i(!0);while(i!==null)}gi=null,Ql=!1}catch(r){throw gi!==null&&(gi=gi.slice(t+1)),Og(Gd,ur),r}finally{nt=e,Fc=!1}}return null}var gs=[],vs=0,El=null,Tl=0,An=[],Cn=0,Nr=null,vi=1,_i="";function xr(t,e){gs[vs++]=Tl,gs[vs++]=El,El=t,Tl=e}function h0(t,e,n){An[Cn++]=vi,An[Cn++]=_i,An[Cn++]=Nr,Nr=t;var i=vi;t=_i;var r=32-Wn(i)-1;i&=~(1<<r),n+=1;var s=32-Wn(e)+r;if(30<s){var o=r-r%5;s=(i&(1<<o)-1).toString(32),i>>=o,r-=o,vi=1<<32-Wn(e)+r|n<<r|i,_i=s+t}else vi=1<<s|n<<r|i,_i=t}function Qd(t){t.return!==null&&(xr(t,1),h0(t,1,0))}function Jd(t){for(;t===El;)El=gs[--vs],gs[vs]=null,Tl=gs[--vs],gs[vs]=null;for(;t===Nr;)Nr=An[--Cn],An[Cn]=null,_i=An[--Cn],An[Cn]=null,vi=An[--Cn],An[Cn]=null}var vn=null,gn=null,dt=!1,Gn=null;function p0(t,e){var n=bn(5,null,null,0);n.elementType="DELETED",n.stateNode=e,n.return=t,e=t.deletions,e===null?(t.deletions=[n],t.flags|=16):e.push(n)}function Th(t,e){switch(t.tag){case 5:var n=t.type;return e=e.nodeType!==1||n.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(t.stateNode=e,vn=t,gn=Zi(e.firstChild),!0):!1;case 6:return e=t.pendingProps===""||e.nodeType!==3?null:e,e!==null?(t.stateNode=e,vn=t,gn=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(n=Nr!==null?{id:vi,overflow:_i}:null,t.memoizedState={dehydrated:e,treeContext:n,retryLane:1073741824},n=bn(18,null,null,0),n.stateNode=e,n.return=t,t.child=n,vn=t,gn=null,!0):!1;default:return!1}}function id(t){return(t.mode&1)!==0&&(t.flags&128)===0}function rd(t){if(dt){var e=gn;if(e){var n=e;if(!Th(t,e)){if(id(t))throw Error(se(418));e=Zi(n.nextSibling);var i=vn;e&&Th(t,e)?p0(i,n):(t.flags=t.flags&-4097|2,dt=!1,vn=t)}}else{if(id(t))throw Error(se(418));t.flags=t.flags&-4097|2,dt=!1,vn=t}}}function wh(t){for(t=t.return;t!==null&&t.tag!==5&&t.tag!==3&&t.tag!==13;)t=t.return;vn=t}function ya(t){if(t!==vn)return!1;if(!dt)return wh(t),dt=!0,!1;var e;if((e=t.tag!==3)&&!(e=t.tag!==5)&&(e=t.type,e=e!=="head"&&e!=="body"&&!Ju(t.type,t.memoizedProps)),e&&(e=gn)){if(id(t))throw m0(),Error(se(418));for(;e;)p0(t,e),e=Zi(e.nextSibling)}if(wh(t),t.tag===13){if(t=t.memoizedState,t=t!==null?t.dehydrated:null,!t)throw Error(se(317));e:{for(t=t.nextSibling,e=0;t;){if(t.nodeType===8){var n=t.data;if(n==="/$"){if(e===0){gn=Zi(t.nextSibling);break e}e--}else n!=="$"&&n!=="$!"&&n!=="$?"||e++}t=t.nextSibling}gn=null}}else gn=vn?Zi(t.stateNode.nextSibling):null;return!0}function m0(){for(var t=gn;t;)t=Zi(t.nextSibling)}function Ds(){gn=vn=null,dt=!1}function ef(t){Gn===null?Gn=[t]:Gn.push(t)}var sy=Ci.ReactCurrentBatchConfig;function oo(t,e,n){if(t=n.ref,t!==null&&typeof t!="function"&&typeof t!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(se(309));var i=n.stateNode}if(!i)throw Error(se(147,t));var r=i,s=""+t;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(o){var a=r.refs;o===null?delete a[s]:a[s]=o},e._stringRef=s,e)}if(typeof t!="string")throw Error(se(284));if(!n._owner)throw Error(se(290,t))}return t}function Sa(t,e){throw t=Object.prototype.toString.call(e),Error(se(31,t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t))}function Ah(t){var e=t._init;return e(t._payload)}function g0(t){function e(u,v){if(t){var _=u.deletions;_===null?(u.deletions=[v],u.flags|=16):_.push(v)}}function n(u,v){if(!t)return null;for(;v!==null;)e(u,v),v=v.sibling;return null}function i(u,v){for(u=new Map;v!==null;)v.key!==null?u.set(v.key,v):u.set(v.index,v),v=v.sibling;return u}function r(u,v){return u=tr(u,v),u.index=0,u.sibling=null,u}function s(u,v,_){return u.index=_,t?(_=u.alternate,_!==null?(_=_.index,_<v?(u.flags|=2,v):_):(u.flags|=2,v)):(u.flags|=1048576,v)}function o(u){return t&&u.alternate===null&&(u.flags|=2),u}function a(u,v,_,M){return v===null||v.tag!==6?(v=Gc(_,u.mode,M),v.return=u,v):(v=r(v,_),v.return=u,v)}function l(u,v,_,M){var b=_.type;return b===us?f(u,v,_.props.children,M,_.key):v!==null&&(v.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ki&&Ah(b)===v.type)?(M=r(v,_.props),M.ref=oo(u,v,_),M.return=u,M):(M=cl(_.type,_.key,_.props,null,u.mode,M),M.ref=oo(u,v,_),M.return=u,M)}function c(u,v,_,M){return v===null||v.tag!==4||v.stateNode.containerInfo!==_.containerInfo||v.stateNode.implementation!==_.implementation?(v=jc(_,u.mode,M),v.return=u,v):(v=r(v,_.children||[]),v.return=u,v)}function f(u,v,_,M,b){return v===null||v.tag!==7?(v=Pr(_,u.mode,M,b),v.return=u,v):(v=r(v,_),v.return=u,v)}function d(u,v,_){if(typeof v=="string"&&v!==""||typeof v=="number")return v=Gc(""+v,u.mode,_),v.return=u,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case ua:return _=cl(v.type,v.key,v.props,null,u.mode,_),_.ref=oo(u,null,v),_.return=u,_;case cs:return v=jc(v,u.mode,_),v.return=u,v;case ki:var M=v._init;return d(u,M(v._payload),_)}if(xo(v)||to(v))return v=Pr(v,u.mode,_,null),v.return=u,v;Sa(u,v)}return null}function h(u,v,_,M){var b=v!==null?v.key:null;if(typeof _=="string"&&_!==""||typeof _=="number")return b!==null?null:a(u,v,""+_,M);if(typeof _=="object"&&_!==null){switch(_.$$typeof){case ua:return _.key===b?l(u,v,_,M):null;case cs:return _.key===b?c(u,v,_,M):null;case ki:return b=_._init,h(u,v,b(_._payload),M)}if(xo(_)||to(_))return b!==null?null:f(u,v,_,M,null);Sa(u,_)}return null}function p(u,v,_,M,b){if(typeof M=="string"&&M!==""||typeof M=="number")return u=u.get(_)||null,a(v,u,""+M,b);if(typeof M=="object"&&M!==null){switch(M.$$typeof){case ua:return u=u.get(M.key===null?_:M.key)||null,l(v,u,M,b);case cs:return u=u.get(M.key===null?_:M.key)||null,c(v,u,M,b);case ki:var C=M._init;return p(u,v,_,C(M._payload),b)}if(xo(M)||to(M))return u=u.get(_)||null,f(v,u,M,b,null);Sa(v,M)}return null}function g(u,v,_,M){for(var b=null,C=null,A=v,L=v=0,T=null;A!==null&&L<_.length;L++){A.index>L?(T=A,A=null):T=A.sibling;var S=h(u,A,_[L],M);if(S===null){A===null&&(A=T);break}t&&A&&S.alternate===null&&e(u,A),v=s(S,v,L),C===null?b=S:C.sibling=S,C=S,A=T}if(L===_.length)return n(u,A),dt&&xr(u,L),b;if(A===null){for(;L<_.length;L++)A=d(u,_[L],M),A!==null&&(v=s(A,v,L),C===null?b=A:C.sibling=A,C=A);return dt&&xr(u,L),b}for(A=i(u,A);L<_.length;L++)T=p(A,u,L,_[L],M),T!==null&&(t&&T.alternate!==null&&A.delete(T.key===null?L:T.key),v=s(T,v,L),C===null?b=T:C.sibling=T,C=T);return t&&A.forEach(function(U){return e(u,U)}),dt&&xr(u,L),b}function x(u,v,_,M){var b=to(_);if(typeof b!="function")throw Error(se(150));if(_=b.call(_),_==null)throw Error(se(151));for(var C=b=null,A=v,L=v=0,T=null,S=_.next();A!==null&&!S.done;L++,S=_.next()){A.index>L?(T=A,A=null):T=A.sibling;var U=h(u,A,S.value,M);if(U===null){A===null&&(A=T);break}t&&A&&U.alternate===null&&e(u,A),v=s(U,v,L),C===null?b=U:C.sibling=U,C=U,A=T}if(S.done)return n(u,A),dt&&xr(u,L),b;if(A===null){for(;!S.done;L++,S=_.next())S=d(u,S.value,M),S!==null&&(v=s(S,v,L),C===null?b=S:C.sibling=S,C=S);return dt&&xr(u,L),b}for(A=i(u,A);!S.done;L++,S=_.next())S=p(A,u,L,S.value,M),S!==null&&(t&&S.alternate!==null&&A.delete(S.key===null?L:S.key),v=s(S,v,L),C===null?b=S:C.sibling=S,C=S);return t&&A.forEach(function(k){return e(u,k)}),dt&&xr(u,L),b}function m(u,v,_,M){if(typeof _=="object"&&_!==null&&_.type===us&&_.key===null&&(_=_.props.children),typeof _=="object"&&_!==null){switch(_.$$typeof){case ua:e:{for(var b=_.key,C=v;C!==null;){if(C.key===b){if(b=_.type,b===us){if(C.tag===7){n(u,C.sibling),v=r(C,_.props.children),v.return=u,u=v;break e}}else if(C.elementType===b||typeof b=="object"&&b!==null&&b.$$typeof===ki&&Ah(b)===C.type){n(u,C.sibling),v=r(C,_.props),v.ref=oo(u,C,_),v.return=u,u=v;break e}n(u,C);break}else e(u,C);C=C.sibling}_.type===us?(v=Pr(_.props.children,u.mode,M,_.key),v.return=u,u=v):(M=cl(_.type,_.key,_.props,null,u.mode,M),M.ref=oo(u,v,_),M.return=u,u=M)}return o(u);case cs:e:{for(C=_.key;v!==null;){if(v.key===C)if(v.tag===4&&v.stateNode.containerInfo===_.containerInfo&&v.stateNode.implementation===_.implementation){n(u,v.sibling),v=r(v,_.children||[]),v.return=u,u=v;break e}else{n(u,v);break}else e(u,v);v=v.sibling}v=jc(_,u.mode,M),v.return=u,u=v}return o(u);case ki:return C=_._init,m(u,v,C(_._payload),M)}if(xo(_))return g(u,v,_,M);if(to(_))return x(u,v,_,M);Sa(u,_)}return typeof _=="string"&&_!==""||typeof _=="number"?(_=""+_,v!==null&&v.tag===6?(n(u,v.sibling),v=r(v,_),v.return=u,u=v):(n(u,v),v=Gc(_,u.mode,M),v.return=u,u=v),o(u)):n(u,v)}return m}var Is=g0(!0),v0=g0(!1),wl=cr(null),Al=null,_s=null,tf=null;function nf(){tf=_s=Al=null}function rf(t){var e=wl.current;ct(wl),t._currentValue=e}function sd(t,e,n){for(;t!==null;){var i=t.alternate;if((t.childLanes&e)!==e?(t.childLanes|=e,i!==null&&(i.childLanes|=e)):i!==null&&(i.childLanes&e)!==e&&(i.childLanes|=e),t===n)break;t=t.return}}function As(t,e){Al=t,tf=_s=null,t=t.dependencies,t!==null&&t.firstContext!==null&&(t.lanes&e&&(rn=!0),t.firstContext=null)}function Dn(t){var e=t._currentValue;if(tf!==t)if(t={context:t,memoizedValue:e,next:null},_s===null){if(Al===null)throw Error(se(308));_s=t,Al.dependencies={lanes:0,firstContext:t}}else _s=_s.next=t;return e}var wr=null;function sf(t){wr===null?wr=[t]:wr.push(t)}function _0(t,e,n,i){var r=e.interleaved;return r===null?(n.next=n,sf(e)):(n.next=r.next,r.next=n),e.interleaved=n,wi(t,i)}function wi(t,e){t.lanes|=e;var n=t.alternate;for(n!==null&&(n.lanes|=e),n=t,t=t.return;t!==null;)t.childLanes|=e,n=t.alternate,n!==null&&(n.childLanes|=e),n=t,t=t.return;return n.tag===3?n.stateNode:null}var zi=!1;function of(t){t.updateQueue={baseState:t.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function x0(t,e){t=t.updateQueue,e.updateQueue===t&&(e.updateQueue={baseState:t.baseState,firstBaseUpdate:t.firstBaseUpdate,lastBaseUpdate:t.lastBaseUpdate,shared:t.shared,effects:t.effects})}function yi(t,e){return{eventTime:t,lane:e,tag:0,payload:null,callback:null,next:null}}function Qi(t,e,n){var i=t.updateQueue;if(i===null)return null;if(i=i.shared,Ke&2){var r=i.pending;return r===null?e.next=e:(e.next=r.next,r.next=e),i.pending=e,wi(t,n)}return r=i.interleaved,r===null?(e.next=e,sf(i)):(e.next=r.next,r.next=e),i.interleaved=e,wi(t,n)}function il(t,e,n){if(e=e.updateQueue,e!==null&&(e=e.shared,(n&4194240)!==0)){var i=e.lanes;i&=t.pendingLanes,n|=i,e.lanes=n,jd(t,n)}}function Ch(t,e){var n=t.updateQueue,i=t.alternate;if(i!==null&&(i=i.updateQueue,n===i)){var r=null,s=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};s===null?r=s=o:s=s.next=o,n=n.next}while(n!==null);s===null?r=s=e:s=s.next=e}else r=s=e;n={baseState:i.baseState,firstBaseUpdate:r,lastBaseUpdate:s,shared:i.shared,effects:i.effects},t.updateQueue=n;return}t=n.lastBaseUpdate,t===null?n.firstBaseUpdate=e:t.next=e,n.lastBaseUpdate=e}function Cl(t,e,n,i){var r=t.updateQueue;zi=!1;var s=r.firstBaseUpdate,o=r.lastBaseUpdate,a=r.shared.pending;if(a!==null){r.shared.pending=null;var l=a,c=l.next;l.next=null,o===null?s=c:o.next=c,o=l;var f=t.alternate;f!==null&&(f=f.updateQueue,a=f.lastBaseUpdate,a!==o&&(a===null?f.firstBaseUpdate=c:a.next=c,f.lastBaseUpdate=l))}if(s!==null){var d=r.baseState;o=0,f=c=l=null,a=s;do{var h=a.lane,p=a.eventTime;if((i&h)===h){f!==null&&(f=f.next={eventTime:p,lane:0,tag:a.tag,payload:a.payload,callback:a.callback,next:null});e:{var g=t,x=a;switch(h=e,p=n,x.tag){case 1:if(g=x.payload,typeof g=="function"){d=g.call(p,d,h);break e}d=g;break e;case 3:g.flags=g.flags&-65537|128;case 0:if(g=x.payload,h=typeof g=="function"?g.call(p,d,h):g,h==null)break e;d=mt({},d,h);break e;case 2:zi=!0}}a.callback!==null&&a.lane!==0&&(t.flags|=64,h=r.effects,h===null?r.effects=[a]:h.push(a))}else p={eventTime:p,lane:h,tag:a.tag,payload:a.payload,callback:a.callback,next:null},f===null?(c=f=p,l=d):f=f.next=p,o|=h;if(a=a.next,a===null){if(a=r.shared.pending,a===null)break;h=a,a=h.next,h.next=null,r.lastBaseUpdate=h,r.shared.pending=null}}while(!0);if(f===null&&(l=d),r.baseState=l,r.firstBaseUpdate=c,r.lastBaseUpdate=f,e=r.shared.interleaved,e!==null){r=e;do o|=r.lane,r=r.next;while(r!==e)}else s===null&&(r.shared.lanes=0);Ir|=o,t.lanes=o,t.memoizedState=d}}function Rh(t,e,n){if(t=e.effects,e.effects=null,t!==null)for(e=0;e<t.length;e++){var i=t[e],r=i.callback;if(r!==null){if(i.callback=null,i=n,typeof r!="function")throw Error(se(191,r));r.call(i)}}}var oa={},ii=cr(oa),Xo=cr(oa),$o=cr(oa);function Ar(t){if(t===oa)throw Error(se(174));return t}function af(t,e){switch(st($o,e),st(Xo,t),st(ii,oa),t=e.nodeType,t){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:zu(null,"");break;default:t=t===8?e.parentNode:e,e=t.namespaceURI||null,t=t.tagName,e=zu(e,t)}ct(ii),st(ii,e)}function Us(){ct(ii),ct(Xo),ct($o)}function y0(t){Ar($o.current);var e=Ar(ii.current),n=zu(e,t.type);e!==n&&(st(Xo,t),st(ii,n))}function lf(t){Xo.current===t&&(ct(ii),ct(Xo))}var ht=cr(0);function Rl(t){for(var e=t;e!==null;){if(e.tag===13){var n=e.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var Oc=[];function cf(){for(var t=0;t<Oc.length;t++)Oc[t]._workInProgressVersionPrimary=null;Oc.length=0}var rl=Ci.ReactCurrentDispatcher,kc=Ci.ReactCurrentBatchConfig,Dr=0,pt=null,Tt=null,Lt=null,bl=!1,bo=!1,Yo=0,oy=0;function Ht(){throw Error(se(321))}function uf(t,e){if(e===null)return!1;for(var n=0;n<e.length&&n<t.length;n++)if(!Yn(t[n],e[n]))return!1;return!0}function df(t,e,n,i,r,s){if(Dr=s,pt=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,rl.current=t===null||t.memoizedState===null?uy:dy,t=n(i,r),bo){s=0;do{if(bo=!1,Yo=0,25<=s)throw Error(se(301));s+=1,Lt=Tt=null,e.updateQueue=null,rl.current=fy,t=n(i,r)}while(bo)}if(rl.current=Pl,e=Tt!==null&&Tt.next!==null,Dr=0,Lt=Tt=pt=null,bl=!1,e)throw Error(se(300));return t}function ff(){var t=Yo!==0;return Yo=0,t}function Kn(){var t={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Lt===null?pt.memoizedState=Lt=t:Lt=Lt.next=t,Lt}function In(){if(Tt===null){var t=pt.alternate;t=t!==null?t.memoizedState:null}else t=Tt.next;var e=Lt===null?pt.memoizedState:Lt.next;if(e!==null)Lt=e,Tt=t;else{if(t===null)throw Error(se(310));Tt=t,t={memoizedState:Tt.memoizedState,baseState:Tt.baseState,baseQueue:Tt.baseQueue,queue:Tt.queue,next:null},Lt===null?pt.memoizedState=Lt=t:Lt=Lt.next=t}return Lt}function qo(t,e){return typeof e=="function"?e(t):e}function zc(t){var e=In(),n=e.queue;if(n===null)throw Error(se(311));n.lastRenderedReducer=t;var i=Tt,r=i.baseQueue,s=n.pending;if(s!==null){if(r!==null){var o=r.next;r.next=s.next,s.next=o}i.baseQueue=r=s,n.pending=null}if(r!==null){s=r.next,i=i.baseState;var a=o=null,l=null,c=s;do{var f=c.lane;if((Dr&f)===f)l!==null&&(l=l.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),i=c.hasEagerState?c.eagerState:t(i,c.action);else{var d={lane:f,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};l===null?(a=l=d,o=i):l=l.next=d,pt.lanes|=f,Ir|=f}c=c.next}while(c!==null&&c!==s);l===null?o=i:l.next=a,Yn(i,e.memoizedState)||(rn=!0),e.memoizedState=i,e.baseState=o,e.baseQueue=l,n.lastRenderedState=i}if(t=n.interleaved,t!==null){r=t;do s=r.lane,pt.lanes|=s,Ir|=s,r=r.next;while(r!==t)}else r===null&&(n.lanes=0);return[e.memoizedState,n.dispatch]}function Bc(t){var e=In(),n=e.queue;if(n===null)throw Error(se(311));n.lastRenderedReducer=t;var i=n.dispatch,r=n.pending,s=e.memoizedState;if(r!==null){n.pending=null;var o=r=r.next;do s=t(s,o.action),o=o.next;while(o!==r);Yn(s,e.memoizedState)||(rn=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),n.lastRenderedState=s}return[s,i]}function S0(){}function M0(t,e){var n=pt,i=In(),r=e(),s=!Yn(i.memoizedState,r);if(s&&(i.memoizedState=r,rn=!0),i=i.queue,hf(w0.bind(null,n,i,t),[t]),i.getSnapshot!==e||s||Lt!==null&&Lt.memoizedState.tag&1){if(n.flags|=2048,Ko(9,T0.bind(null,n,i,r,e),void 0,null),Ut===null)throw Error(se(349));Dr&30||E0(n,e,r)}return r}function E0(t,e,n){t.flags|=16384,t={getSnapshot:e,value:n},e=pt.updateQueue,e===null?(e={lastEffect:null,stores:null},pt.updateQueue=e,e.stores=[t]):(n=e.stores,n===null?e.stores=[t]:n.push(t))}function T0(t,e,n,i){e.value=n,e.getSnapshot=i,A0(e)&&C0(t)}function w0(t,e,n){return n(function(){A0(e)&&C0(t)})}function A0(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!Yn(t,n)}catch{return!0}}function C0(t){var e=wi(t,1);e!==null&&Xn(e,t,1,-1)}function bh(t){var e=Kn();return typeof t=="function"&&(t=t()),e.memoizedState=e.baseState=t,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:qo,lastRenderedState:t},e.queue=t,t=t.dispatch=cy.bind(null,pt,t),[e.memoizedState,t]}function Ko(t,e,n,i){return t={tag:t,create:e,destroy:n,deps:i,next:null},e=pt.updateQueue,e===null?(e={lastEffect:null,stores:null},pt.updateQueue=e,e.lastEffect=t.next=t):(n=e.lastEffect,n===null?e.lastEffect=t.next=t:(i=n.next,n.next=t,t.next=i,e.lastEffect=t)),t}function R0(){return In().memoizedState}function sl(t,e,n,i){var r=Kn();pt.flags|=t,r.memoizedState=Ko(1|e,n,void 0,i===void 0?null:i)}function Jl(t,e,n,i){var r=In();i=i===void 0?null:i;var s=void 0;if(Tt!==null){var o=Tt.memoizedState;if(s=o.destroy,i!==null&&uf(i,o.deps)){r.memoizedState=Ko(e,n,s,i);return}}pt.flags|=t,r.memoizedState=Ko(1|e,n,s,i)}function Ph(t,e){return sl(8390656,8,t,e)}function hf(t,e){return Jl(2048,8,t,e)}function b0(t,e){return Jl(4,2,t,e)}function P0(t,e){return Jl(4,4,t,e)}function L0(t,e){if(typeof e=="function")return t=t(),e(t),function(){e(null)};if(e!=null)return t=t(),e.current=t,function(){e.current=null}}function N0(t,e,n){return n=n!=null?n.concat([t]):null,Jl(4,4,L0.bind(null,e,t),n)}function pf(){}function D0(t,e){var n=In();e=e===void 0?null:e;var i=n.memoizedState;return i!==null&&e!==null&&uf(e,i[1])?i[0]:(n.memoizedState=[t,e],t)}function I0(t,e){var n=In();e=e===void 0?null:e;var i=n.memoizedState;return i!==null&&e!==null&&uf(e,i[1])?i[0]:(t=t(),n.memoizedState=[t,e],t)}function U0(t,e,n){return Dr&21?(Yn(n,e)||(n=Bg(),pt.lanes|=n,Ir|=n,t.baseState=!0),e):(t.baseState&&(t.baseState=!1,rn=!0),t.memoizedState=n)}function ay(t,e){var n=nt;nt=n!==0&&4>n?n:4,t(!0);var i=kc.transition;kc.transition={};try{t(!1),e()}finally{nt=n,kc.transition=i}}function F0(){return In().memoizedState}function ly(t,e,n){var i=er(t);if(n={lane:i,action:n,hasEagerState:!1,eagerState:null,next:null},O0(t))k0(e,n);else if(n=_0(t,e,n,i),n!==null){var r=Qt();Xn(n,t,i,r),z0(n,e,i)}}function cy(t,e,n){var i=er(t),r={lane:i,action:n,hasEagerState:!1,eagerState:null,next:null};if(O0(t))k0(e,r);else{var s=t.alternate;if(t.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var o=e.lastRenderedState,a=s(o,n);if(r.hasEagerState=!0,r.eagerState=a,Yn(a,o)){var l=e.interleaved;l===null?(r.next=r,sf(e)):(r.next=l.next,l.next=r),e.interleaved=r;return}}catch{}finally{}n=_0(t,e,r,i),n!==null&&(r=Qt(),Xn(n,t,i,r),z0(n,e,i))}}function O0(t){var e=t.alternate;return t===pt||e!==null&&e===pt}function k0(t,e){bo=bl=!0;var n=t.pending;n===null?e.next=e:(e.next=n.next,n.next=e),t.pending=e}function z0(t,e,n){if(n&4194240){var i=e.lanes;i&=t.pendingLanes,n|=i,e.lanes=n,jd(t,n)}}var Pl={readContext:Dn,useCallback:Ht,useContext:Ht,useEffect:Ht,useImperativeHandle:Ht,useInsertionEffect:Ht,useLayoutEffect:Ht,useMemo:Ht,useReducer:Ht,useRef:Ht,useState:Ht,useDebugValue:Ht,useDeferredValue:Ht,useTransition:Ht,useMutableSource:Ht,useSyncExternalStore:Ht,useId:Ht,unstable_isNewReconciler:!1},uy={readContext:Dn,useCallback:function(t,e){return Kn().memoizedState=[t,e===void 0?null:e],t},useContext:Dn,useEffect:Ph,useImperativeHandle:function(t,e,n){return n=n!=null?n.concat([t]):null,sl(4194308,4,L0.bind(null,e,t),n)},useLayoutEffect:function(t,e){return sl(4194308,4,t,e)},useInsertionEffect:function(t,e){return sl(4,2,t,e)},useMemo:function(t,e){var n=Kn();return e=e===void 0?null:e,t=t(),n.memoizedState=[t,e],t},useReducer:function(t,e,n){var i=Kn();return e=n!==void 0?n(e):e,i.memoizedState=i.baseState=e,t={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:t,lastRenderedState:e},i.queue=t,t=t.dispatch=ly.bind(null,pt,t),[i.memoizedState,t]},useRef:function(t){var e=Kn();return t={current:t},e.memoizedState=t},useState:bh,useDebugValue:pf,useDeferredValue:function(t){return Kn().memoizedState=t},useTransition:function(){var t=bh(!1),e=t[0];return t=ay.bind(null,t[1]),Kn().memoizedState=t,[e,t]},useMutableSource:function(){},useSyncExternalStore:function(t,e,n){var i=pt,r=Kn();if(dt){if(n===void 0)throw Error(se(407));n=n()}else{if(n=e(),Ut===null)throw Error(se(349));Dr&30||E0(i,e,n)}r.memoizedState=n;var s={value:n,getSnapshot:e};return r.queue=s,Ph(w0.bind(null,i,s,t),[t]),i.flags|=2048,Ko(9,T0.bind(null,i,s,n,e),void 0,null),n},useId:function(){var t=Kn(),e=Ut.identifierPrefix;if(dt){var n=_i,i=vi;n=(i&~(1<<32-Wn(i)-1)).toString(32)+n,e=":"+e+"R"+n,n=Yo++,0<n&&(e+="H"+n.toString(32)),e+=":"}else n=oy++,e=":"+e+"r"+n.toString(32)+":";return t.memoizedState=e},unstable_isNewReconciler:!1},dy={readContext:Dn,useCallback:D0,useContext:Dn,useEffect:hf,useImperativeHandle:N0,useInsertionEffect:b0,useLayoutEffect:P0,useMemo:I0,useReducer:zc,useRef:R0,useState:function(){return zc(qo)},useDebugValue:pf,useDeferredValue:function(t){var e=In();return U0(e,Tt.memoizedState,t)},useTransition:function(){var t=zc(qo)[0],e=In().memoizedState;return[t,e]},useMutableSource:S0,useSyncExternalStore:M0,useId:F0,unstable_isNewReconciler:!1},fy={readContext:Dn,useCallback:D0,useContext:Dn,useEffect:hf,useImperativeHandle:N0,useInsertionEffect:b0,useLayoutEffect:P0,useMemo:I0,useReducer:Bc,useRef:R0,useState:function(){return Bc(qo)},useDebugValue:pf,useDeferredValue:function(t){var e=In();return Tt===null?e.memoizedState=t:U0(e,Tt.memoizedState,t)},useTransition:function(){var t=Bc(qo)[0],e=In().memoizedState;return[t,e]},useMutableSource:S0,useSyncExternalStore:M0,useId:F0,unstable_isNewReconciler:!1};function Bn(t,e){if(t&&t.defaultProps){e=mt({},e),t=t.defaultProps;for(var n in t)e[n]===void 0&&(e[n]=t[n]);return e}return e}function od(t,e,n,i){e=t.memoizedState,n=n(i,e),n=n==null?e:mt({},e,n),t.memoizedState=n,t.lanes===0&&(t.updateQueue.baseState=n)}var ec={isMounted:function(t){return(t=t._reactInternals)?Or(t)===t:!1},enqueueSetState:function(t,e,n){t=t._reactInternals;var i=Qt(),r=er(t),s=yi(i,r);s.payload=e,n!=null&&(s.callback=n),e=Qi(t,s,r),e!==null&&(Xn(e,t,r,i),il(e,t,r))},enqueueReplaceState:function(t,e,n){t=t._reactInternals;var i=Qt(),r=er(t),s=yi(i,r);s.tag=1,s.payload=e,n!=null&&(s.callback=n),e=Qi(t,s,r),e!==null&&(Xn(e,t,r,i),il(e,t,r))},enqueueForceUpdate:function(t,e){t=t._reactInternals;var n=Qt(),i=er(t),r=yi(n,i);r.tag=2,e!=null&&(r.callback=e),e=Qi(t,r,i),e!==null&&(Xn(e,t,i,n),il(e,t,i))}};function Lh(t,e,n,i,r,s,o){return t=t.stateNode,typeof t.shouldComponentUpdate=="function"?t.shouldComponentUpdate(i,s,o):e.prototype&&e.prototype.isPureReactComponent?!Vo(n,i)||!Vo(r,s):!0}function B0(t,e,n){var i=!1,r=sr,s=e.contextType;return typeof s=="object"&&s!==null?s=Dn(s):(r=on(e)?Lr:$t.current,i=e.contextTypes,s=(i=i!=null)?Ns(t,r):sr),e=new e(n,s),t.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=ec,t.stateNode=e,e._reactInternals=t,i&&(t=t.stateNode,t.__reactInternalMemoizedUnmaskedChildContext=r,t.__reactInternalMemoizedMaskedChildContext=s),e}function Nh(t,e,n,i){t=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(n,i),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(n,i),e.state!==t&&ec.enqueueReplaceState(e,e.state,null)}function ad(t,e,n,i){var r=t.stateNode;r.props=n,r.state=t.memoizedState,r.refs={},of(t);var s=e.contextType;typeof s=="object"&&s!==null?r.context=Dn(s):(s=on(e)?Lr:$t.current,r.context=Ns(t,s)),r.state=t.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(od(t,e,s,n),r.state=t.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(e=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),e!==r.state&&ec.enqueueReplaceState(r,r.state,null),Cl(t,n,r,i),r.state=t.memoizedState),typeof r.componentDidMount=="function"&&(t.flags|=4194308)}function Fs(t,e){try{var n="",i=e;do n+=B_(i),i=i.return;while(i);var r=n}catch(s){r=`
Error generating stack: `+s.message+`
`+s.stack}return{value:t,source:e,stack:r,digest:null}}function Hc(t,e,n){return{value:t,source:null,stack:n??null,digest:e??null}}function ld(t,e){try{console.error(e.value)}catch(n){setTimeout(function(){throw n})}}var hy=typeof WeakMap=="function"?WeakMap:Map;function H0(t,e,n){n=yi(-1,n),n.tag=3,n.payload={element:null};var i=e.value;return n.callback=function(){Nl||(Nl=!0,_d=i),ld(t,e)},n}function V0(t,e,n){n=yi(-1,n),n.tag=3;var i=t.type.getDerivedStateFromError;if(typeof i=="function"){var r=e.value;n.payload=function(){return i(r)},n.callback=function(){ld(t,e)}}var s=t.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(n.callback=function(){ld(t,e),typeof i!="function"&&(Ji===null?Ji=new Set([this]):Ji.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),n}function Dh(t,e,n){var i=t.pingCache;if(i===null){i=t.pingCache=new hy;var r=new Set;i.set(e,r)}else r=i.get(e),r===void 0&&(r=new Set,i.set(e,r));r.has(n)||(r.add(n),t=Cy.bind(null,t,e,n),e.then(t,t))}function Ih(t){do{var e;if((e=t.tag===13)&&(e=t.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return t;t=t.return}while(t!==null);return null}function Uh(t,e,n,i,r){return t.mode&1?(t.flags|=65536,t.lanes=r,t):(t===e?t.flags|=65536:(t.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(e=yi(-1,1),e.tag=2,Qi(n,e,1))),n.lanes|=1),t)}var py=Ci.ReactCurrentOwner,rn=!1;function Kt(t,e,n,i){e.child=t===null?v0(e,null,n,i):Is(e,t.child,n,i)}function Fh(t,e,n,i,r){n=n.render;var s=e.ref;return As(e,r),i=df(t,e,n,i,s,r),n=ff(),t!==null&&!rn?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~r,Ai(t,e,r)):(dt&&n&&Qd(e),e.flags|=1,Kt(t,e,i,r),e.child)}function Oh(t,e,n,i,r){if(t===null){var s=n.type;return typeof s=="function"&&!Mf(s)&&s.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(e.tag=15,e.type=s,G0(t,e,s,i,r)):(t=cl(n.type,null,i,e,e.mode,r),t.ref=e.ref,t.return=e,e.child=t)}if(s=t.child,!(t.lanes&r)){var o=s.memoizedProps;if(n=n.compare,n=n!==null?n:Vo,n(o,i)&&t.ref===e.ref)return Ai(t,e,r)}return e.flags|=1,t=tr(s,i),t.ref=e.ref,t.return=e,e.child=t}function G0(t,e,n,i,r){if(t!==null){var s=t.memoizedProps;if(Vo(s,i)&&t.ref===e.ref)if(rn=!1,e.pendingProps=i=s,(t.lanes&r)!==0)t.flags&131072&&(rn=!0);else return e.lanes=t.lanes,Ai(t,e,r)}return cd(t,e,n,i,r)}function j0(t,e,n){var i=e.pendingProps,r=i.children,s=t!==null?t.memoizedState:null;if(i.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},st(ys,hn),hn|=n;else{if(!(n&1073741824))return t=s!==null?s.baseLanes|n:n,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:t,cachePool:null,transitions:null},e.updateQueue=null,st(ys,hn),hn|=t,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},i=s!==null?s.baseLanes:n,st(ys,hn),hn|=i}else s!==null?(i=s.baseLanes|n,e.memoizedState=null):i=n,st(ys,hn),hn|=i;return Kt(t,e,r,n),e.child}function W0(t,e){var n=e.ref;(t===null&&n!==null||t!==null&&t.ref!==n)&&(e.flags|=512,e.flags|=2097152)}function cd(t,e,n,i,r){var s=on(n)?Lr:$t.current;return s=Ns(e,s),As(e,r),n=df(t,e,n,i,s,r),i=ff(),t!==null&&!rn?(e.updateQueue=t.updateQueue,e.flags&=-2053,t.lanes&=~r,Ai(t,e,r)):(dt&&i&&Qd(e),e.flags|=1,Kt(t,e,n,r),e.child)}function kh(t,e,n,i,r){if(on(n)){var s=!0;Ml(e)}else s=!1;if(As(e,r),e.stateNode===null)ol(t,e),B0(e,n,i),ad(e,n,i,r),i=!0;else if(t===null){var o=e.stateNode,a=e.memoizedProps;o.props=a;var l=o.context,c=n.contextType;typeof c=="object"&&c!==null?c=Dn(c):(c=on(n)?Lr:$t.current,c=Ns(e,c));var f=n.getDerivedStateFromProps,d=typeof f=="function"||typeof o.getSnapshotBeforeUpdate=="function";d||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==i||l!==c)&&Nh(e,o,i,c),zi=!1;var h=e.memoizedState;o.state=h,Cl(e,i,o,r),l=e.memoizedState,a!==i||h!==l||sn.current||zi?(typeof f=="function"&&(od(e,n,f,i),l=e.memoizedState),(a=zi||Lh(e,n,a,i,h,l,c))?(d||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=i,e.memoizedState=l),o.props=i,o.state=l,o.context=c,i=a):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),i=!1)}else{o=e.stateNode,x0(t,e),a=e.memoizedProps,c=e.type===e.elementType?a:Bn(e.type,a),o.props=c,d=e.pendingProps,h=o.context,l=n.contextType,typeof l=="object"&&l!==null?l=Dn(l):(l=on(n)?Lr:$t.current,l=Ns(e,l));var p=n.getDerivedStateFromProps;(f=typeof p=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==d||h!==l)&&Nh(e,o,i,l),zi=!1,h=e.memoizedState,o.state=h,Cl(e,i,o,r);var g=e.memoizedState;a!==d||h!==g||sn.current||zi?(typeof p=="function"&&(od(e,n,p,i),g=e.memoizedState),(c=zi||Lh(e,n,c,i,h,g,l)||!1)?(f||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(i,g,l),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(i,g,l)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||a===t.memoizedProps&&h===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===t.memoizedProps&&h===t.memoizedState||(e.flags|=1024),e.memoizedProps=i,e.memoizedState=g),o.props=i,o.state=g,o.context=l,i=c):(typeof o.componentDidUpdate!="function"||a===t.memoizedProps&&h===t.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===t.memoizedProps&&h===t.memoizedState||(e.flags|=1024),i=!1)}return ud(t,e,n,i,s,r)}function ud(t,e,n,i,r,s){W0(t,e);var o=(e.flags&128)!==0;if(!i&&!o)return r&&Eh(e,n,!1),Ai(t,e,s);i=e.stateNode,py.current=e;var a=o&&typeof n.getDerivedStateFromError!="function"?null:i.render();return e.flags|=1,t!==null&&o?(e.child=Is(e,t.child,null,s),e.child=Is(e,null,a,s)):Kt(t,e,a,s),e.memoizedState=i.state,r&&Eh(e,n,!0),e.child}function X0(t){var e=t.stateNode;e.pendingContext?Mh(t,e.pendingContext,e.pendingContext!==e.context):e.context&&Mh(t,e.context,!1),af(t,e.containerInfo)}function zh(t,e,n,i,r){return Ds(),ef(r),e.flags|=256,Kt(t,e,n,i),e.child}var dd={dehydrated:null,treeContext:null,retryLane:0};function fd(t){return{baseLanes:t,cachePool:null,transitions:null}}function $0(t,e,n){var i=e.pendingProps,r=ht.current,s=!1,o=(e.flags&128)!==0,a;if((a=o)||(a=t!==null&&t.memoizedState===null?!1:(r&2)!==0),a?(s=!0,e.flags&=-129):(t===null||t.memoizedState!==null)&&(r|=1),st(ht,r&1),t===null)return rd(e),t=e.memoizedState,t!==null&&(t=t.dehydrated,t!==null)?(e.mode&1?t.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=i.children,t=i.fallback,s?(i=e.mode,s=e.child,o={mode:"hidden",children:o},!(i&1)&&s!==null?(s.childLanes=0,s.pendingProps=o):s=ic(o,i,0,null),t=Pr(t,i,n,null),s.return=e,t.return=e,s.sibling=t,e.child=s,e.child.memoizedState=fd(n),e.memoizedState=dd,t):mf(e,o));if(r=t.memoizedState,r!==null&&(a=r.dehydrated,a!==null))return my(t,e,o,i,a,r,n);if(s){s=i.fallback,o=e.mode,r=t.child,a=r.sibling;var l={mode:"hidden",children:i.children};return!(o&1)&&e.child!==r?(i=e.child,i.childLanes=0,i.pendingProps=l,e.deletions=null):(i=tr(r,l),i.subtreeFlags=r.subtreeFlags&14680064),a!==null?s=tr(a,s):(s=Pr(s,o,n,null),s.flags|=2),s.return=e,i.return=e,i.sibling=s,e.child=i,i=s,s=e.child,o=t.child.memoizedState,o=o===null?fd(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},s.memoizedState=o,s.childLanes=t.childLanes&~n,e.memoizedState=dd,i}return s=t.child,t=s.sibling,i=tr(s,{mode:"visible",children:i.children}),!(e.mode&1)&&(i.lanes=n),i.return=e,i.sibling=null,t!==null&&(n=e.deletions,n===null?(e.deletions=[t],e.flags|=16):n.push(t)),e.child=i,e.memoizedState=null,i}function mf(t,e){return e=ic({mode:"visible",children:e},t.mode,0,null),e.return=t,t.child=e}function Ma(t,e,n,i){return i!==null&&ef(i),Is(e,t.child,null,n),t=mf(e,e.pendingProps.children),t.flags|=2,e.memoizedState=null,t}function my(t,e,n,i,r,s,o){if(n)return e.flags&256?(e.flags&=-257,i=Hc(Error(se(422))),Ma(t,e,o,i)):e.memoizedState!==null?(e.child=t.child,e.flags|=128,null):(s=i.fallback,r=e.mode,i=ic({mode:"visible",children:i.children},r,0,null),s=Pr(s,r,o,null),s.flags|=2,i.return=e,s.return=e,i.sibling=s,e.child=i,e.mode&1&&Is(e,t.child,null,o),e.child.memoizedState=fd(o),e.memoizedState=dd,s);if(!(e.mode&1))return Ma(t,e,o,null);if(r.data==="$!"){if(i=r.nextSibling&&r.nextSibling.dataset,i)var a=i.dgst;return i=a,s=Error(se(419)),i=Hc(s,i,void 0),Ma(t,e,o,i)}if(a=(o&t.childLanes)!==0,rn||a){if(i=Ut,i!==null){switch(o&-o){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=r&(i.suspendedLanes|o)?0:r,r!==0&&r!==s.retryLane&&(s.retryLane=r,wi(t,r),Xn(i,t,r,-1))}return Sf(),i=Hc(Error(se(421))),Ma(t,e,o,i)}return r.data==="$?"?(e.flags|=128,e.child=t.child,e=Ry.bind(null,t),r._reactRetry=e,null):(t=s.treeContext,gn=Zi(r.nextSibling),vn=e,dt=!0,Gn=null,t!==null&&(An[Cn++]=vi,An[Cn++]=_i,An[Cn++]=Nr,vi=t.id,_i=t.overflow,Nr=e),e=mf(e,i.children),e.flags|=4096,e)}function Bh(t,e,n){t.lanes|=e;var i=t.alternate;i!==null&&(i.lanes|=e),sd(t.return,e,n)}function Vc(t,e,n,i,r){var s=t.memoizedState;s===null?t.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:i,tail:n,tailMode:r}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=i,s.tail=n,s.tailMode=r)}function Y0(t,e,n){var i=e.pendingProps,r=i.revealOrder,s=i.tail;if(Kt(t,e,i.children,n),i=ht.current,i&2)i=i&1|2,e.flags|=128;else{if(t!==null&&t.flags&128)e:for(t=e.child;t!==null;){if(t.tag===13)t.memoizedState!==null&&Bh(t,n,e);else if(t.tag===19)Bh(t,n,e);else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break e;for(;t.sibling===null;){if(t.return===null||t.return===e)break e;t=t.return}t.sibling.return=t.return,t=t.sibling}i&=1}if(st(ht,i),!(e.mode&1))e.memoizedState=null;else switch(r){case"forwards":for(n=e.child,r=null;n!==null;)t=n.alternate,t!==null&&Rl(t)===null&&(r=n),n=n.sibling;n=r,n===null?(r=e.child,e.child=null):(r=n.sibling,n.sibling=null),Vc(e,!1,r,n,s);break;case"backwards":for(n=null,r=e.child,e.child=null;r!==null;){if(t=r.alternate,t!==null&&Rl(t)===null){e.child=r;break}t=r.sibling,r.sibling=n,n=r,r=t}Vc(e,!0,n,null,s);break;case"together":Vc(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function ol(t,e){!(e.mode&1)&&t!==null&&(t.alternate=null,e.alternate=null,e.flags|=2)}function Ai(t,e,n){if(t!==null&&(e.dependencies=t.dependencies),Ir|=e.lanes,!(n&e.childLanes))return null;if(t!==null&&e.child!==t.child)throw Error(se(153));if(e.child!==null){for(t=e.child,n=tr(t,t.pendingProps),e.child=n,n.return=e;t.sibling!==null;)t=t.sibling,n=n.sibling=tr(t,t.pendingProps),n.return=e;n.sibling=null}return e.child}function gy(t,e,n){switch(e.tag){case 3:X0(e),Ds();break;case 5:y0(e);break;case 1:on(e.type)&&Ml(e);break;case 4:af(e,e.stateNode.containerInfo);break;case 10:var i=e.type._context,r=e.memoizedProps.value;st(wl,i._currentValue),i._currentValue=r;break;case 13:if(i=e.memoizedState,i!==null)return i.dehydrated!==null?(st(ht,ht.current&1),e.flags|=128,null):n&e.child.childLanes?$0(t,e,n):(st(ht,ht.current&1),t=Ai(t,e,n),t!==null?t.sibling:null);st(ht,ht.current&1);break;case 19:if(i=(n&e.childLanes)!==0,t.flags&128){if(i)return Y0(t,e,n);e.flags|=128}if(r=e.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),st(ht,ht.current),i)break;return null;case 22:case 23:return e.lanes=0,j0(t,e,n)}return Ai(t,e,n)}var q0,hd,K0,Z0;q0=function(t,e){for(var n=e.child;n!==null;){if(n.tag===5||n.tag===6)t.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};hd=function(){};K0=function(t,e,n,i){var r=t.memoizedProps;if(r!==i){t=e.stateNode,Ar(ii.current);var s=null;switch(n){case"input":r=Uu(t,r),i=Uu(t,i),s=[];break;case"select":r=mt({},r,{value:void 0}),i=mt({},i,{value:void 0}),s=[];break;case"textarea":r=ku(t,r),i=ku(t,i),s=[];break;default:typeof r.onClick!="function"&&typeof i.onClick=="function"&&(t.onclick=yl)}Bu(n,i);var o;n=null;for(c in r)if(!i.hasOwnProperty(c)&&r.hasOwnProperty(c)&&r[c]!=null)if(c==="style"){var a=r[c];for(o in a)a.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Uo.hasOwnProperty(c)?s||(s=[]):(s=s||[]).push(c,null));for(c in i){var l=i[c];if(a=r!=null?r[c]:void 0,i.hasOwnProperty(c)&&l!==a&&(l!=null||a!=null))if(c==="style")if(a){for(o in a)!a.hasOwnProperty(o)||l&&l.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in l)l.hasOwnProperty(o)&&a[o]!==l[o]&&(n||(n={}),n[o]=l[o])}else n||(s||(s=[]),s.push(c,n)),n=l;else c==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,a=a?a.__html:void 0,l!=null&&a!==l&&(s=s||[]).push(c,l)):c==="children"?typeof l!="string"&&typeof l!="number"||(s=s||[]).push(c,""+l):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Uo.hasOwnProperty(c)?(l!=null&&c==="onScroll"&&lt("scroll",t),s||a===l||(s=[])):(s=s||[]).push(c,l))}n&&(s=s||[]).push("style",n);var c=s;(e.updateQueue=c)&&(e.flags|=4)}};Z0=function(t,e,n,i){n!==i&&(e.flags|=4)};function ao(t,e){if(!dt)switch(t.tailMode){case"hidden":e=t.tail;for(var n=null;e!==null;)e.alternate!==null&&(n=e),e=e.sibling;n===null?t.tail=null:n.sibling=null;break;case"collapsed":n=t.tail;for(var i=null;n!==null;)n.alternate!==null&&(i=n),n=n.sibling;i===null?e||t.tail===null?t.tail=null:t.tail.sibling=null:i.sibling=null}}function Vt(t){var e=t.alternate!==null&&t.alternate.child===t.child,n=0,i=0;if(e)for(var r=t.child;r!==null;)n|=r.lanes|r.childLanes,i|=r.subtreeFlags&14680064,i|=r.flags&14680064,r.return=t,r=r.sibling;else for(r=t.child;r!==null;)n|=r.lanes|r.childLanes,i|=r.subtreeFlags,i|=r.flags,r.return=t,r=r.sibling;return t.subtreeFlags|=i,t.childLanes=n,e}function vy(t,e,n){var i=e.pendingProps;switch(Jd(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Vt(e),null;case 1:return on(e.type)&&Sl(),Vt(e),null;case 3:return i=e.stateNode,Us(),ct(sn),ct($t),cf(),i.pendingContext&&(i.context=i.pendingContext,i.pendingContext=null),(t===null||t.child===null)&&(ya(e)?e.flags|=4:t===null||t.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,Gn!==null&&(Sd(Gn),Gn=null))),hd(t,e),Vt(e),null;case 5:lf(e);var r=Ar($o.current);if(n=e.type,t!==null&&e.stateNode!=null)K0(t,e,n,i,r),t.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!i){if(e.stateNode===null)throw Error(se(166));return Vt(e),null}if(t=Ar(ii.current),ya(e)){i=e.stateNode,n=e.type;var s=e.memoizedProps;switch(i[Qn]=e,i[Wo]=s,t=(e.mode&1)!==0,n){case"dialog":lt("cancel",i),lt("close",i);break;case"iframe":case"object":case"embed":lt("load",i);break;case"video":case"audio":for(r=0;r<So.length;r++)lt(So[r],i);break;case"source":lt("error",i);break;case"img":case"image":case"link":lt("error",i),lt("load",i);break;case"details":lt("toggle",i);break;case"input":qf(i,s),lt("invalid",i);break;case"select":i._wrapperState={wasMultiple:!!s.multiple},lt("invalid",i);break;case"textarea":Zf(i,s),lt("invalid",i)}Bu(n,s),r=null;for(var o in s)if(s.hasOwnProperty(o)){var a=s[o];o==="children"?typeof a=="string"?i.textContent!==a&&(s.suppressHydrationWarning!==!0&&xa(i.textContent,a,t),r=["children",a]):typeof a=="number"&&i.textContent!==""+a&&(s.suppressHydrationWarning!==!0&&xa(i.textContent,a,t),r=["children",""+a]):Uo.hasOwnProperty(o)&&a!=null&&o==="onScroll"&&lt("scroll",i)}switch(n){case"input":da(i),Kf(i,s,!0);break;case"textarea":da(i),Qf(i);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(i.onclick=yl)}i=r,e.updateQueue=i,i!==null&&(e.flags|=4)}else{o=r.nodeType===9?r:r.ownerDocument,t==="http://www.w3.org/1999/xhtml"&&(t=wg(n)),t==="http://www.w3.org/1999/xhtml"?n==="script"?(t=o.createElement("div"),t.innerHTML="<script><\/script>",t=t.removeChild(t.firstChild)):typeof i.is=="string"?t=o.createElement(n,{is:i.is}):(t=o.createElement(n),n==="select"&&(o=t,i.multiple?o.multiple=!0:i.size&&(o.size=i.size))):t=o.createElementNS(t,n),t[Qn]=e,t[Wo]=i,q0(t,e,!1,!1),e.stateNode=t;e:{switch(o=Hu(n,i),n){case"dialog":lt("cancel",t),lt("close",t),r=i;break;case"iframe":case"object":case"embed":lt("load",t),r=i;break;case"video":case"audio":for(r=0;r<So.length;r++)lt(So[r],t);r=i;break;case"source":lt("error",t),r=i;break;case"img":case"image":case"link":lt("error",t),lt("load",t),r=i;break;case"details":lt("toggle",t),r=i;break;case"input":qf(t,i),r=Uu(t,i),lt("invalid",t);break;case"option":r=i;break;case"select":t._wrapperState={wasMultiple:!!i.multiple},r=mt({},i,{value:void 0}),lt("invalid",t);break;case"textarea":Zf(t,i),r=ku(t,i),lt("invalid",t);break;default:r=i}Bu(n,r),a=r;for(s in a)if(a.hasOwnProperty(s)){var l=a[s];s==="style"?Rg(t,l):s==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,l!=null&&Ag(t,l)):s==="children"?typeof l=="string"?(n!=="textarea"||l!=="")&&Fo(t,l):typeof l=="number"&&Fo(t,""+l):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(Uo.hasOwnProperty(s)?l!=null&&s==="onScroll"&&lt("scroll",t):l!=null&&kd(t,s,l,o))}switch(n){case"input":da(t),Kf(t,i,!1);break;case"textarea":da(t),Qf(t);break;case"option":i.value!=null&&t.setAttribute("value",""+rr(i.value));break;case"select":t.multiple=!!i.multiple,s=i.value,s!=null?Ms(t,!!i.multiple,s,!1):i.defaultValue!=null&&Ms(t,!!i.multiple,i.defaultValue,!0);break;default:typeof r.onClick=="function"&&(t.onclick=yl)}switch(n){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break e;case"img":i=!0;break e;default:i=!1}}i&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return Vt(e),null;case 6:if(t&&e.stateNode!=null)Z0(t,e,t.memoizedProps,i);else{if(typeof i!="string"&&e.stateNode===null)throw Error(se(166));if(n=Ar($o.current),Ar(ii.current),ya(e)){if(i=e.stateNode,n=e.memoizedProps,i[Qn]=e,(s=i.nodeValue!==n)&&(t=vn,t!==null))switch(t.tag){case 3:xa(i.nodeValue,n,(t.mode&1)!==0);break;case 5:t.memoizedProps.suppressHydrationWarning!==!0&&xa(i.nodeValue,n,(t.mode&1)!==0)}s&&(e.flags|=4)}else i=(n.nodeType===9?n:n.ownerDocument).createTextNode(i),i[Qn]=e,e.stateNode=i}return Vt(e),null;case 13:if(ct(ht),i=e.memoizedState,t===null||t.memoizedState!==null&&t.memoizedState.dehydrated!==null){if(dt&&gn!==null&&e.mode&1&&!(e.flags&128))m0(),Ds(),e.flags|=98560,s=!1;else if(s=ya(e),i!==null&&i.dehydrated!==null){if(t===null){if(!s)throw Error(se(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(se(317));s[Qn]=e}else Ds(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;Vt(e),s=!1}else Gn!==null&&(Sd(Gn),Gn=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=n,e):(i=i!==null,i!==(t!==null&&t.memoizedState!==null)&&i&&(e.child.flags|=8192,e.mode&1&&(t===null||ht.current&1?wt===0&&(wt=3):Sf())),e.updateQueue!==null&&(e.flags|=4),Vt(e),null);case 4:return Us(),hd(t,e),t===null&&Go(e.stateNode.containerInfo),Vt(e),null;case 10:return rf(e.type._context),Vt(e),null;case 17:return on(e.type)&&Sl(),Vt(e),null;case 19:if(ct(ht),s=e.memoizedState,s===null)return Vt(e),null;if(i=(e.flags&128)!==0,o=s.rendering,o===null)if(i)ao(s,!1);else{if(wt!==0||t!==null&&t.flags&128)for(t=e.child;t!==null;){if(o=Rl(t),o!==null){for(e.flags|=128,ao(s,!1),i=o.updateQueue,i!==null&&(e.updateQueue=i,e.flags|=4),e.subtreeFlags=0,i=n,n=e.child;n!==null;)s=n,t=i,s.flags&=14680066,o=s.alternate,o===null?(s.childLanes=0,s.lanes=t,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=o.childLanes,s.lanes=o.lanes,s.child=o.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=o.memoizedProps,s.memoizedState=o.memoizedState,s.updateQueue=o.updateQueue,s.type=o.type,t=o.dependencies,s.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),n=n.sibling;return st(ht,ht.current&1|2),e.child}t=t.sibling}s.tail!==null&&xt()>Os&&(e.flags|=128,i=!0,ao(s,!1),e.lanes=4194304)}else{if(!i)if(t=Rl(o),t!==null){if(e.flags|=128,i=!0,n=t.updateQueue,n!==null&&(e.updateQueue=n,e.flags|=4),ao(s,!0),s.tail===null&&s.tailMode==="hidden"&&!o.alternate&&!dt)return Vt(e),null}else 2*xt()-s.renderingStartTime>Os&&n!==1073741824&&(e.flags|=128,i=!0,ao(s,!1),e.lanes=4194304);s.isBackwards?(o.sibling=e.child,e.child=o):(n=s.last,n!==null?n.sibling=o:e.child=o,s.last=o)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=xt(),e.sibling=null,n=ht.current,st(ht,i?n&1|2:n&1),e):(Vt(e),null);case 22:case 23:return yf(),i=e.memoizedState!==null,t!==null&&t.memoizedState!==null!==i&&(e.flags|=8192),i&&e.mode&1?hn&1073741824&&(Vt(e),e.subtreeFlags&6&&(e.flags|=8192)):Vt(e),null;case 24:return null;case 25:return null}throw Error(se(156,e.tag))}function _y(t,e){switch(Jd(e),e.tag){case 1:return on(e.type)&&Sl(),t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 3:return Us(),ct(sn),ct($t),cf(),t=e.flags,t&65536&&!(t&128)?(e.flags=t&-65537|128,e):null;case 5:return lf(e),null;case 13:if(ct(ht),t=e.memoizedState,t!==null&&t.dehydrated!==null){if(e.alternate===null)throw Error(se(340));Ds()}return t=e.flags,t&65536?(e.flags=t&-65537|128,e):null;case 19:return ct(ht),null;case 4:return Us(),null;case 10:return rf(e.type._context),null;case 22:case 23:return yf(),null;case 24:return null;default:return null}}var Ea=!1,Wt=!1,xy=typeof WeakSet=="function"?WeakSet:Set,ve=null;function xs(t,e){var n=t.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(i){gt(t,e,i)}else n.current=null}function pd(t,e,n){try{n()}catch(i){gt(t,e,i)}}var Hh=!1;function yy(t,e){if(Zu=vl,t=n0(),Zd(t)){if("selectionStart"in t)var n={start:t.selectionStart,end:t.selectionEnd};else e:{n=(n=t.ownerDocument)&&n.defaultView||window;var i=n.getSelection&&n.getSelection();if(i&&i.rangeCount!==0){n=i.anchorNode;var r=i.anchorOffset,s=i.focusNode;i=i.focusOffset;try{n.nodeType,s.nodeType}catch{n=null;break e}var o=0,a=-1,l=-1,c=0,f=0,d=t,h=null;t:for(;;){for(var p;d!==n||r!==0&&d.nodeType!==3||(a=o+r),d!==s||i!==0&&d.nodeType!==3||(l=o+i),d.nodeType===3&&(o+=d.nodeValue.length),(p=d.firstChild)!==null;)h=d,d=p;for(;;){if(d===t)break t;if(h===n&&++c===r&&(a=o),h===s&&++f===i&&(l=o),(p=d.nextSibling)!==null)break;d=h,h=d.parentNode}d=p}n=a===-1||l===-1?null:{start:a,end:l}}else n=null}n=n||{start:0,end:0}}else n=null;for(Qu={focusedElem:t,selectionRange:n},vl=!1,ve=e;ve!==null;)if(e=ve,t=e.child,(e.subtreeFlags&1028)!==0&&t!==null)t.return=e,ve=t;else for(;ve!==null;){e=ve;try{var g=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(g!==null){var x=g.memoizedProps,m=g.memoizedState,u=e.stateNode,v=u.getSnapshotBeforeUpdate(e.elementType===e.type?x:Bn(e.type,x),m);u.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var _=e.stateNode.containerInfo;_.nodeType===1?_.textContent="":_.nodeType===9&&_.documentElement&&_.removeChild(_.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(se(163))}}catch(M){gt(e,e.return,M)}if(t=e.sibling,t!==null){t.return=e.return,ve=t;break}ve=e.return}return g=Hh,Hh=!1,g}function Po(t,e,n){var i=e.updateQueue;if(i=i!==null?i.lastEffect:null,i!==null){var r=i=i.next;do{if((r.tag&t)===t){var s=r.destroy;r.destroy=void 0,s!==void 0&&pd(e,n,s)}r=r.next}while(r!==i)}}function tc(t,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var n=e=e.next;do{if((n.tag&t)===t){var i=n.create;n.destroy=i()}n=n.next}while(n!==e)}}function md(t){var e=t.ref;if(e!==null){var n=t.stateNode;switch(t.tag){case 5:t=n;break;default:t=n}typeof e=="function"?e(t):e.current=t}}function Q0(t){var e=t.alternate;e!==null&&(t.alternate=null,Q0(e)),t.child=null,t.deletions=null,t.sibling=null,t.tag===5&&(e=t.stateNode,e!==null&&(delete e[Qn],delete e[Wo],delete e[td],delete e[ny],delete e[iy])),t.stateNode=null,t.return=null,t.dependencies=null,t.memoizedProps=null,t.memoizedState=null,t.pendingProps=null,t.stateNode=null,t.updateQueue=null}function J0(t){return t.tag===5||t.tag===3||t.tag===4}function Vh(t){e:for(;;){for(;t.sibling===null;){if(t.return===null||J0(t.return))return null;t=t.return}for(t.sibling.return=t.return,t=t.sibling;t.tag!==5&&t.tag!==6&&t.tag!==18;){if(t.flags&2||t.child===null||t.tag===4)continue e;t.child.return=t,t=t.child}if(!(t.flags&2))return t.stateNode}}function gd(t,e,n){var i=t.tag;if(i===5||i===6)t=t.stateNode,e?n.nodeType===8?n.parentNode.insertBefore(t,e):n.insertBefore(t,e):(n.nodeType===8?(e=n.parentNode,e.insertBefore(t,n)):(e=n,e.appendChild(t)),n=n._reactRootContainer,n!=null||e.onclick!==null||(e.onclick=yl));else if(i!==4&&(t=t.child,t!==null))for(gd(t,e,n),t=t.sibling;t!==null;)gd(t,e,n),t=t.sibling}function vd(t,e,n){var i=t.tag;if(i===5||i===6)t=t.stateNode,e?n.insertBefore(t,e):n.appendChild(t);else if(i!==4&&(t=t.child,t!==null))for(vd(t,e,n),t=t.sibling;t!==null;)vd(t,e,n),t=t.sibling}var Ft=null,Hn=!1;function Li(t,e,n){for(n=n.child;n!==null;)ev(t,e,n),n=n.sibling}function ev(t,e,n){if(ni&&typeof ni.onCommitFiberUnmount=="function")try{ni.onCommitFiberUnmount($l,n)}catch{}switch(n.tag){case 5:Wt||xs(n,e);case 6:var i=Ft,r=Hn;Ft=null,Li(t,e,n),Ft=i,Hn=r,Ft!==null&&(Hn?(t=Ft,n=n.stateNode,t.nodeType===8?t.parentNode.removeChild(n):t.removeChild(n)):Ft.removeChild(n.stateNode));break;case 18:Ft!==null&&(Hn?(t=Ft,n=n.stateNode,t.nodeType===8?Uc(t.parentNode,n):t.nodeType===1&&Uc(t,n),Bo(t)):Uc(Ft,n.stateNode));break;case 4:i=Ft,r=Hn,Ft=n.stateNode.containerInfo,Hn=!0,Li(t,e,n),Ft=i,Hn=r;break;case 0:case 11:case 14:case 15:if(!Wt&&(i=n.updateQueue,i!==null&&(i=i.lastEffect,i!==null))){r=i=i.next;do{var s=r,o=s.destroy;s=s.tag,o!==void 0&&(s&2||s&4)&&pd(n,e,o),r=r.next}while(r!==i)}Li(t,e,n);break;case 1:if(!Wt&&(xs(n,e),i=n.stateNode,typeof i.componentWillUnmount=="function"))try{i.props=n.memoizedProps,i.state=n.memoizedState,i.componentWillUnmount()}catch(a){gt(n,e,a)}Li(t,e,n);break;case 21:Li(t,e,n);break;case 22:n.mode&1?(Wt=(i=Wt)||n.memoizedState!==null,Li(t,e,n),Wt=i):Li(t,e,n);break;default:Li(t,e,n)}}function Gh(t){var e=t.updateQueue;if(e!==null){t.updateQueue=null;var n=t.stateNode;n===null&&(n=t.stateNode=new xy),e.forEach(function(i){var r=by.bind(null,t,i);n.has(i)||(n.add(i),i.then(r,r))})}}function Un(t,e){var n=e.deletions;if(n!==null)for(var i=0;i<n.length;i++){var r=n[i];try{var s=t,o=e,a=o;e:for(;a!==null;){switch(a.tag){case 5:Ft=a.stateNode,Hn=!1;break e;case 3:Ft=a.stateNode.containerInfo,Hn=!0;break e;case 4:Ft=a.stateNode.containerInfo,Hn=!0;break e}a=a.return}if(Ft===null)throw Error(se(160));ev(s,o,r),Ft=null,Hn=!1;var l=r.alternate;l!==null&&(l.return=null),r.return=null}catch(c){gt(r,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)tv(e,t),e=e.sibling}function tv(t,e){var n=t.alternate,i=t.flags;switch(t.tag){case 0:case 11:case 14:case 15:if(Un(e,t),qn(t),i&4){try{Po(3,t,t.return),tc(3,t)}catch(x){gt(t,t.return,x)}try{Po(5,t,t.return)}catch(x){gt(t,t.return,x)}}break;case 1:Un(e,t),qn(t),i&512&&n!==null&&xs(n,n.return);break;case 5:if(Un(e,t),qn(t),i&512&&n!==null&&xs(n,n.return),t.flags&32){var r=t.stateNode;try{Fo(r,"")}catch(x){gt(t,t.return,x)}}if(i&4&&(r=t.stateNode,r!=null)){var s=t.memoizedProps,o=n!==null?n.memoizedProps:s,a=t.type,l=t.updateQueue;if(t.updateQueue=null,l!==null)try{a==="input"&&s.type==="radio"&&s.name!=null&&Eg(r,s),Hu(a,o);var c=Hu(a,s);for(o=0;o<l.length;o+=2){var f=l[o],d=l[o+1];f==="style"?Rg(r,d):f==="dangerouslySetInnerHTML"?Ag(r,d):f==="children"?Fo(r,d):kd(r,f,d,c)}switch(a){case"input":Fu(r,s);break;case"textarea":Tg(r,s);break;case"select":var h=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!s.multiple;var p=s.value;p!=null?Ms(r,!!s.multiple,p,!1):h!==!!s.multiple&&(s.defaultValue!=null?Ms(r,!!s.multiple,s.defaultValue,!0):Ms(r,!!s.multiple,s.multiple?[]:"",!1))}r[Wo]=s}catch(x){gt(t,t.return,x)}}break;case 6:if(Un(e,t),qn(t),i&4){if(t.stateNode===null)throw Error(se(162));r=t.stateNode,s=t.memoizedProps;try{r.nodeValue=s}catch(x){gt(t,t.return,x)}}break;case 3:if(Un(e,t),qn(t),i&4&&n!==null&&n.memoizedState.isDehydrated)try{Bo(e.containerInfo)}catch(x){gt(t,t.return,x)}break;case 4:Un(e,t),qn(t);break;case 13:Un(e,t),qn(t),r=t.child,r.flags&8192&&(s=r.memoizedState!==null,r.stateNode.isHidden=s,!s||r.alternate!==null&&r.alternate.memoizedState!==null||(_f=xt())),i&4&&Gh(t);break;case 22:if(f=n!==null&&n.memoizedState!==null,t.mode&1?(Wt=(c=Wt)||f,Un(e,t),Wt=c):Un(e,t),qn(t),i&8192){if(c=t.memoizedState!==null,(t.stateNode.isHidden=c)&&!f&&t.mode&1)for(ve=t,f=t.child;f!==null;){for(d=ve=f;ve!==null;){switch(h=ve,p=h.child,h.tag){case 0:case 11:case 14:case 15:Po(4,h,h.return);break;case 1:xs(h,h.return);var g=h.stateNode;if(typeof g.componentWillUnmount=="function"){i=h,n=h.return;try{e=i,g.props=e.memoizedProps,g.state=e.memoizedState,g.componentWillUnmount()}catch(x){gt(i,n,x)}}break;case 5:xs(h,h.return);break;case 22:if(h.memoizedState!==null){Wh(d);continue}}p!==null?(p.return=h,ve=p):Wh(d)}f=f.sibling}e:for(f=null,d=t;;){if(d.tag===5){if(f===null){f=d;try{r=d.stateNode,c?(s=r.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(a=d.stateNode,l=d.memoizedProps.style,o=l!=null&&l.hasOwnProperty("display")?l.display:null,a.style.display=Cg("display",o))}catch(x){gt(t,t.return,x)}}}else if(d.tag===6){if(f===null)try{d.stateNode.nodeValue=c?"":d.memoizedProps}catch(x){gt(t,t.return,x)}}else if((d.tag!==22&&d.tag!==23||d.memoizedState===null||d===t)&&d.child!==null){d.child.return=d,d=d.child;continue}if(d===t)break e;for(;d.sibling===null;){if(d.return===null||d.return===t)break e;f===d&&(f=null),d=d.return}f===d&&(f=null),d.sibling.return=d.return,d=d.sibling}}break;case 19:Un(e,t),qn(t),i&4&&Gh(t);break;case 21:break;default:Un(e,t),qn(t)}}function qn(t){var e=t.flags;if(e&2){try{e:{for(var n=t.return;n!==null;){if(J0(n)){var i=n;break e}n=n.return}throw Error(se(160))}switch(i.tag){case 5:var r=i.stateNode;i.flags&32&&(Fo(r,""),i.flags&=-33);var s=Vh(t);vd(t,s,r);break;case 3:case 4:var o=i.stateNode.containerInfo,a=Vh(t);gd(t,a,o);break;default:throw Error(se(161))}}catch(l){gt(t,t.return,l)}t.flags&=-3}e&4096&&(t.flags&=-4097)}function Sy(t,e,n){ve=t,nv(t)}function nv(t,e,n){for(var i=(t.mode&1)!==0;ve!==null;){var r=ve,s=r.child;if(r.tag===22&&i){var o=r.memoizedState!==null||Ea;if(!o){var a=r.alternate,l=a!==null&&a.memoizedState!==null||Wt;a=Ea;var c=Wt;if(Ea=o,(Wt=l)&&!c)for(ve=r;ve!==null;)o=ve,l=o.child,o.tag===22&&o.memoizedState!==null?Xh(r):l!==null?(l.return=o,ve=l):Xh(r);for(;s!==null;)ve=s,nv(s),s=s.sibling;ve=r,Ea=a,Wt=c}jh(t)}else r.subtreeFlags&8772&&s!==null?(s.return=r,ve=s):jh(t)}}function jh(t){for(;ve!==null;){var e=ve;if(e.flags&8772){var n=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:Wt||tc(5,e);break;case 1:var i=e.stateNode;if(e.flags&4&&!Wt)if(n===null)i.componentDidMount();else{var r=e.elementType===e.type?n.memoizedProps:Bn(e.type,n.memoizedProps);i.componentDidUpdate(r,n.memoizedState,i.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&Rh(e,s,i);break;case 3:var o=e.updateQueue;if(o!==null){if(n=null,e.child!==null)switch(e.child.tag){case 5:n=e.child.stateNode;break;case 1:n=e.child.stateNode}Rh(e,o,n)}break;case 5:var a=e.stateNode;if(n===null&&e.flags&4){n=a;var l=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":l.autoFocus&&n.focus();break;case"img":l.src&&(n.src=l.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var f=c.memoizedState;if(f!==null){var d=f.dehydrated;d!==null&&Bo(d)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(se(163))}Wt||e.flags&512&&md(e)}catch(h){gt(e,e.return,h)}}if(e===t){ve=null;break}if(n=e.sibling,n!==null){n.return=e.return,ve=n;break}ve=e.return}}function Wh(t){for(;ve!==null;){var e=ve;if(e===t){ve=null;break}var n=e.sibling;if(n!==null){n.return=e.return,ve=n;break}ve=e.return}}function Xh(t){for(;ve!==null;){var e=ve;try{switch(e.tag){case 0:case 11:case 15:var n=e.return;try{tc(4,e)}catch(l){gt(e,n,l)}break;case 1:var i=e.stateNode;if(typeof i.componentDidMount=="function"){var r=e.return;try{i.componentDidMount()}catch(l){gt(e,r,l)}}var s=e.return;try{md(e)}catch(l){gt(e,s,l)}break;case 5:var o=e.return;try{md(e)}catch(l){gt(e,o,l)}}}catch(l){gt(e,e.return,l)}if(e===t){ve=null;break}var a=e.sibling;if(a!==null){a.return=e.return,ve=a;break}ve=e.return}}var My=Math.ceil,Ll=Ci.ReactCurrentDispatcher,gf=Ci.ReactCurrentOwner,Ln=Ci.ReactCurrentBatchConfig,Ke=0,Ut=null,Et=null,Ot=0,hn=0,ys=cr(0),wt=0,Zo=null,Ir=0,nc=0,vf=0,Lo=null,tn=null,_f=0,Os=1/0,mi=null,Nl=!1,_d=null,Ji=null,Ta=!1,Wi=null,Dl=0,No=0,xd=null,al=-1,ll=0;function Qt(){return Ke&6?xt():al!==-1?al:al=xt()}function er(t){return t.mode&1?Ke&2&&Ot!==0?Ot&-Ot:sy.transition!==null?(ll===0&&(ll=Bg()),ll):(t=nt,t!==0||(t=window.event,t=t===void 0?16:$g(t.type)),t):1}function Xn(t,e,n,i){if(50<No)throw No=0,xd=null,Error(se(185));ia(t,n,i),(!(Ke&2)||t!==Ut)&&(t===Ut&&(!(Ke&2)&&(nc|=n),wt===4&&Vi(t,Ot)),an(t,i),n===1&&Ke===0&&!(e.mode&1)&&(Os=xt()+500,Ql&&ur()))}function an(t,e){var n=t.callbackNode;sx(t,e);var i=gl(t,t===Ut?Ot:0);if(i===0)n!==null&&th(n),t.callbackNode=null,t.callbackPriority=0;else if(e=i&-i,t.callbackPriority!==e){if(n!=null&&th(n),e===1)t.tag===0?ry($h.bind(null,t)):f0($h.bind(null,t)),ey(function(){!(Ke&6)&&ur()}),n=null;else{switch(Hg(i)){case 1:n=Gd;break;case 4:n=kg;break;case 16:n=ml;break;case 536870912:n=zg;break;default:n=ml}n=uv(n,iv.bind(null,t))}t.callbackPriority=e,t.callbackNode=n}}function iv(t,e){if(al=-1,ll=0,Ke&6)throw Error(se(327));var n=t.callbackNode;if(Cs()&&t.callbackNode!==n)return null;var i=gl(t,t===Ut?Ot:0);if(i===0)return null;if(i&30||i&t.expiredLanes||e)e=Il(t,i);else{e=i;var r=Ke;Ke|=2;var s=sv();(Ut!==t||Ot!==e)&&(mi=null,Os=xt()+500,br(t,e));do try{wy();break}catch(a){rv(t,a)}while(!0);nf(),Ll.current=s,Ke=r,Et!==null?e=0:(Ut=null,Ot=0,e=wt)}if(e!==0){if(e===2&&(r=Xu(t),r!==0&&(i=r,e=yd(t,r))),e===1)throw n=Zo,br(t,0),Vi(t,i),an(t,xt()),n;if(e===6)Vi(t,i);else{if(r=t.current.alternate,!(i&30)&&!Ey(r)&&(e=Il(t,i),e===2&&(s=Xu(t),s!==0&&(i=s,e=yd(t,s))),e===1))throw n=Zo,br(t,0),Vi(t,i),an(t,xt()),n;switch(t.finishedWork=r,t.finishedLanes=i,e){case 0:case 1:throw Error(se(345));case 2:yr(t,tn,mi);break;case 3:if(Vi(t,i),(i&130023424)===i&&(e=_f+500-xt(),10<e)){if(gl(t,0)!==0)break;if(r=t.suspendedLanes,(r&i)!==i){Qt(),t.pingedLanes|=t.suspendedLanes&r;break}t.timeoutHandle=ed(yr.bind(null,t,tn,mi),e);break}yr(t,tn,mi);break;case 4:if(Vi(t,i),(i&4194240)===i)break;for(e=t.eventTimes,r=-1;0<i;){var o=31-Wn(i);s=1<<o,o=e[o],o>r&&(r=o),i&=~s}if(i=r,i=xt()-i,i=(120>i?120:480>i?480:1080>i?1080:1920>i?1920:3e3>i?3e3:4320>i?4320:1960*My(i/1960))-i,10<i){t.timeoutHandle=ed(yr.bind(null,t,tn,mi),i);break}yr(t,tn,mi);break;case 5:yr(t,tn,mi);break;default:throw Error(se(329))}}}return an(t,xt()),t.callbackNode===n?iv.bind(null,t):null}function yd(t,e){var n=Lo;return t.current.memoizedState.isDehydrated&&(br(t,e).flags|=256),t=Il(t,e),t!==2&&(e=tn,tn=n,e!==null&&Sd(e)),t}function Sd(t){tn===null?tn=t:tn.push.apply(tn,t)}function Ey(t){for(var e=t;;){if(e.flags&16384){var n=e.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var i=0;i<n.length;i++){var r=n[i],s=r.getSnapshot;r=r.value;try{if(!Yn(s(),r))return!1}catch{return!1}}}if(n=e.child,e.subtreeFlags&16384&&n!==null)n.return=e,e=n;else{if(e===t)break;for(;e.sibling===null;){if(e.return===null||e.return===t)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function Vi(t,e){for(e&=~vf,e&=~nc,t.suspendedLanes|=e,t.pingedLanes&=~e,t=t.expirationTimes;0<e;){var n=31-Wn(e),i=1<<n;t[n]=-1,e&=~i}}function $h(t){if(Ke&6)throw Error(se(327));Cs();var e=gl(t,0);if(!(e&1))return an(t,xt()),null;var n=Il(t,e);if(t.tag!==0&&n===2){var i=Xu(t);i!==0&&(e=i,n=yd(t,i))}if(n===1)throw n=Zo,br(t,0),Vi(t,e),an(t,xt()),n;if(n===6)throw Error(se(345));return t.finishedWork=t.current.alternate,t.finishedLanes=e,yr(t,tn,mi),an(t,xt()),null}function xf(t,e){var n=Ke;Ke|=1;try{return t(e)}finally{Ke=n,Ke===0&&(Os=xt()+500,Ql&&ur())}}function Ur(t){Wi!==null&&Wi.tag===0&&!(Ke&6)&&Cs();var e=Ke;Ke|=1;var n=Ln.transition,i=nt;try{if(Ln.transition=null,nt=1,t)return t()}finally{nt=i,Ln.transition=n,Ke=e,!(Ke&6)&&ur()}}function yf(){hn=ys.current,ct(ys)}function br(t,e){t.finishedWork=null,t.finishedLanes=0;var n=t.timeoutHandle;if(n!==-1&&(t.timeoutHandle=-1,Jx(n)),Et!==null)for(n=Et.return;n!==null;){var i=n;switch(Jd(i),i.tag){case 1:i=i.type.childContextTypes,i!=null&&Sl();break;case 3:Us(),ct(sn),ct($t),cf();break;case 5:lf(i);break;case 4:Us();break;case 13:ct(ht);break;case 19:ct(ht);break;case 10:rf(i.type._context);break;case 22:case 23:yf()}n=n.return}if(Ut=t,Et=t=tr(t.current,null),Ot=hn=e,wt=0,Zo=null,vf=nc=Ir=0,tn=Lo=null,wr!==null){for(e=0;e<wr.length;e++)if(n=wr[e],i=n.interleaved,i!==null){n.interleaved=null;var r=i.next,s=n.pending;if(s!==null){var o=s.next;s.next=r,i.next=o}n.pending=i}wr=null}return t}function rv(t,e){do{var n=Et;try{if(nf(),rl.current=Pl,bl){for(var i=pt.memoizedState;i!==null;){var r=i.queue;r!==null&&(r.pending=null),i=i.next}bl=!1}if(Dr=0,Lt=Tt=pt=null,bo=!1,Yo=0,gf.current=null,n===null||n.return===null){wt=1,Zo=e,Et=null;break}e:{var s=t,o=n.return,a=n,l=e;if(e=Ot,a.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){var c=l,f=a,d=f.tag;if(!(f.mode&1)&&(d===0||d===11||d===15)){var h=f.alternate;h?(f.updateQueue=h.updateQueue,f.memoizedState=h.memoizedState,f.lanes=h.lanes):(f.updateQueue=null,f.memoizedState=null)}var p=Ih(o);if(p!==null){p.flags&=-257,Uh(p,o,a,s,e),p.mode&1&&Dh(s,c,e),e=p,l=c;var g=e.updateQueue;if(g===null){var x=new Set;x.add(l),e.updateQueue=x}else g.add(l);break e}else{if(!(e&1)){Dh(s,c,e),Sf();break e}l=Error(se(426))}}else if(dt&&a.mode&1){var m=Ih(o);if(m!==null){!(m.flags&65536)&&(m.flags|=256),Uh(m,o,a,s,e),ef(Fs(l,a));break e}}s=l=Fs(l,a),wt!==4&&(wt=2),Lo===null?Lo=[s]:Lo.push(s),s=o;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var u=H0(s,l,e);Ch(s,u);break e;case 1:a=l;var v=s.type,_=s.stateNode;if(!(s.flags&128)&&(typeof v.getDerivedStateFromError=="function"||_!==null&&typeof _.componentDidCatch=="function"&&(Ji===null||!Ji.has(_)))){s.flags|=65536,e&=-e,s.lanes|=e;var M=V0(s,a,e);Ch(s,M);break e}}s=s.return}while(s!==null)}av(n)}catch(b){e=b,Et===n&&n!==null&&(Et=n=n.return);continue}break}while(!0)}function sv(){var t=Ll.current;return Ll.current=Pl,t===null?Pl:t}function Sf(){(wt===0||wt===3||wt===2)&&(wt=4),Ut===null||!(Ir&268435455)&&!(nc&268435455)||Vi(Ut,Ot)}function Il(t,e){var n=Ke;Ke|=2;var i=sv();(Ut!==t||Ot!==e)&&(mi=null,br(t,e));do try{Ty();break}catch(r){rv(t,r)}while(!0);if(nf(),Ke=n,Ll.current=i,Et!==null)throw Error(se(261));return Ut=null,Ot=0,wt}function Ty(){for(;Et!==null;)ov(Et)}function wy(){for(;Et!==null&&!K_();)ov(Et)}function ov(t){var e=cv(t.alternate,t,hn);t.memoizedProps=t.pendingProps,e===null?av(t):Et=e,gf.current=null}function av(t){var e=t;do{var n=e.alternate;if(t=e.return,e.flags&32768){if(n=_y(n,e),n!==null){n.flags&=32767,Et=n;return}if(t!==null)t.flags|=32768,t.subtreeFlags=0,t.deletions=null;else{wt=6,Et=null;return}}else if(n=vy(n,e,hn),n!==null){Et=n;return}if(e=e.sibling,e!==null){Et=e;return}Et=e=t}while(e!==null);wt===0&&(wt=5)}function yr(t,e,n){var i=nt,r=Ln.transition;try{Ln.transition=null,nt=1,Ay(t,e,n,i)}finally{Ln.transition=r,nt=i}return null}function Ay(t,e,n,i){do Cs();while(Wi!==null);if(Ke&6)throw Error(se(327));n=t.finishedWork;var r=t.finishedLanes;if(n===null)return null;if(t.finishedWork=null,t.finishedLanes=0,n===t.current)throw Error(se(177));t.callbackNode=null,t.callbackPriority=0;var s=n.lanes|n.childLanes;if(ox(t,s),t===Ut&&(Et=Ut=null,Ot=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||Ta||(Ta=!0,uv(ml,function(){return Cs(),null})),s=(n.flags&15990)!==0,n.subtreeFlags&15990||s){s=Ln.transition,Ln.transition=null;var o=nt;nt=1;var a=Ke;Ke|=4,gf.current=null,yy(t,n),tv(n,t),Xx(Qu),vl=!!Zu,Qu=Zu=null,t.current=n,Sy(n),Z_(),Ke=a,nt=o,Ln.transition=s}else t.current=n;if(Ta&&(Ta=!1,Wi=t,Dl=r),s=t.pendingLanes,s===0&&(Ji=null),ex(n.stateNode),an(t,xt()),e!==null)for(i=t.onRecoverableError,n=0;n<e.length;n++)r=e[n],i(r.value,{componentStack:r.stack,digest:r.digest});if(Nl)throw Nl=!1,t=_d,_d=null,t;return Dl&1&&t.tag!==0&&Cs(),s=t.pendingLanes,s&1?t===xd?No++:(No=0,xd=t):No=0,ur(),null}function Cs(){if(Wi!==null){var t=Hg(Dl),e=Ln.transition,n=nt;try{if(Ln.transition=null,nt=16>t?16:t,Wi===null)var i=!1;else{if(t=Wi,Wi=null,Dl=0,Ke&6)throw Error(se(331));var r=Ke;for(Ke|=4,ve=t.current;ve!==null;){var s=ve,o=s.child;if(ve.flags&16){var a=s.deletions;if(a!==null){for(var l=0;l<a.length;l++){var c=a[l];for(ve=c;ve!==null;){var f=ve;switch(f.tag){case 0:case 11:case 15:Po(8,f,s)}var d=f.child;if(d!==null)d.return=f,ve=d;else for(;ve!==null;){f=ve;var h=f.sibling,p=f.return;if(Q0(f),f===c){ve=null;break}if(h!==null){h.return=p,ve=h;break}ve=p}}}var g=s.alternate;if(g!==null){var x=g.child;if(x!==null){g.child=null;do{var m=x.sibling;x.sibling=null,x=m}while(x!==null)}}ve=s}}if(s.subtreeFlags&2064&&o!==null)o.return=s,ve=o;else e:for(;ve!==null;){if(s=ve,s.flags&2048)switch(s.tag){case 0:case 11:case 15:Po(9,s,s.return)}var u=s.sibling;if(u!==null){u.return=s.return,ve=u;break e}ve=s.return}}var v=t.current;for(ve=v;ve!==null;){o=ve;var _=o.child;if(o.subtreeFlags&2064&&_!==null)_.return=o,ve=_;else e:for(o=v;ve!==null;){if(a=ve,a.flags&2048)try{switch(a.tag){case 0:case 11:case 15:tc(9,a)}}catch(b){gt(a,a.return,b)}if(a===o){ve=null;break e}var M=a.sibling;if(M!==null){M.return=a.return,ve=M;break e}ve=a.return}}if(Ke=r,ur(),ni&&typeof ni.onPostCommitFiberRoot=="function")try{ni.onPostCommitFiberRoot($l,t)}catch{}i=!0}return i}finally{nt=n,Ln.transition=e}}return!1}function Yh(t,e,n){e=Fs(n,e),e=H0(t,e,1),t=Qi(t,e,1),e=Qt(),t!==null&&(ia(t,1,e),an(t,e))}function gt(t,e,n){if(t.tag===3)Yh(t,t,n);else for(;e!==null;){if(e.tag===3){Yh(e,t,n);break}else if(e.tag===1){var i=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(Ji===null||!Ji.has(i))){t=Fs(n,t),t=V0(e,t,1),e=Qi(e,t,1),t=Qt(),e!==null&&(ia(e,1,t),an(e,t));break}}e=e.return}}function Cy(t,e,n){var i=t.pingCache;i!==null&&i.delete(e),e=Qt(),t.pingedLanes|=t.suspendedLanes&n,Ut===t&&(Ot&n)===n&&(wt===4||wt===3&&(Ot&130023424)===Ot&&500>xt()-_f?br(t,0):vf|=n),an(t,e)}function lv(t,e){e===0&&(t.mode&1?(e=pa,pa<<=1,!(pa&130023424)&&(pa=4194304)):e=1);var n=Qt();t=wi(t,e),t!==null&&(ia(t,e,n),an(t,n))}function Ry(t){var e=t.memoizedState,n=0;e!==null&&(n=e.retryLane),lv(t,n)}function by(t,e){var n=0;switch(t.tag){case 13:var i=t.stateNode,r=t.memoizedState;r!==null&&(n=r.retryLane);break;case 19:i=t.stateNode;break;default:throw Error(se(314))}i!==null&&i.delete(e),lv(t,n)}var cv;cv=function(t,e,n){if(t!==null)if(t.memoizedProps!==e.pendingProps||sn.current)rn=!0;else{if(!(t.lanes&n)&&!(e.flags&128))return rn=!1,gy(t,e,n);rn=!!(t.flags&131072)}else rn=!1,dt&&e.flags&1048576&&h0(e,Tl,e.index);switch(e.lanes=0,e.tag){case 2:var i=e.type;ol(t,e),t=e.pendingProps;var r=Ns(e,$t.current);As(e,n),r=df(null,e,i,t,r,n);var s=ff();return e.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,on(i)?(s=!0,Ml(e)):s=!1,e.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,of(e),r.updater=ec,e.stateNode=r,r._reactInternals=e,ad(e,i,t,n),e=ud(null,e,i,!0,s,n)):(e.tag=0,dt&&s&&Qd(e),Kt(null,e,r,n),e=e.child),e;case 16:i=e.elementType;e:{switch(ol(t,e),t=e.pendingProps,r=i._init,i=r(i._payload),e.type=i,r=e.tag=Ly(i),t=Bn(i,t),r){case 0:e=cd(null,e,i,t,n);break e;case 1:e=kh(null,e,i,t,n);break e;case 11:e=Fh(null,e,i,t,n);break e;case 14:e=Oh(null,e,i,Bn(i.type,t),n);break e}throw Error(se(306,i,""))}return e;case 0:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Bn(i,r),cd(t,e,i,r,n);case 1:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Bn(i,r),kh(t,e,i,r,n);case 3:e:{if(X0(e),t===null)throw Error(se(387));i=e.pendingProps,s=e.memoizedState,r=s.element,x0(t,e),Cl(e,i,null,n);var o=e.memoizedState;if(i=o.element,s.isDehydrated)if(s={element:i,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){r=Fs(Error(se(423)),e),e=zh(t,e,i,n,r);break e}else if(i!==r){r=Fs(Error(se(424)),e),e=zh(t,e,i,n,r);break e}else for(gn=Zi(e.stateNode.containerInfo.firstChild),vn=e,dt=!0,Gn=null,n=v0(e,null,i,n),e.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Ds(),i===r){e=Ai(t,e,n);break e}Kt(t,e,i,n)}e=e.child}return e;case 5:return y0(e),t===null&&rd(e),i=e.type,r=e.pendingProps,s=t!==null?t.memoizedProps:null,o=r.children,Ju(i,r)?o=null:s!==null&&Ju(i,s)&&(e.flags|=32),W0(t,e),Kt(t,e,o,n),e.child;case 6:return t===null&&rd(e),null;case 13:return $0(t,e,n);case 4:return af(e,e.stateNode.containerInfo),i=e.pendingProps,t===null?e.child=Is(e,null,i,n):Kt(t,e,i,n),e.child;case 11:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Bn(i,r),Fh(t,e,i,r,n);case 7:return Kt(t,e,e.pendingProps,n),e.child;case 8:return Kt(t,e,e.pendingProps.children,n),e.child;case 12:return Kt(t,e,e.pendingProps.children,n),e.child;case 10:e:{if(i=e.type._context,r=e.pendingProps,s=e.memoizedProps,o=r.value,st(wl,i._currentValue),i._currentValue=o,s!==null)if(Yn(s.value,o)){if(s.children===r.children&&!sn.current){e=Ai(t,e,n);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var a=s.dependencies;if(a!==null){o=s.child;for(var l=a.firstContext;l!==null;){if(l.context===i){if(s.tag===1){l=yi(-1,n&-n),l.tag=2;var c=s.updateQueue;if(c!==null){c=c.shared;var f=c.pending;f===null?l.next=l:(l.next=f.next,f.next=l),c.pending=l}}s.lanes|=n,l=s.alternate,l!==null&&(l.lanes|=n),sd(s.return,n,e),a.lanes|=n;break}l=l.next}}else if(s.tag===10)o=s.type===e.type?null:s.child;else if(s.tag===18){if(o=s.return,o===null)throw Error(se(341));o.lanes|=n,a=o.alternate,a!==null&&(a.lanes|=n),sd(o,n,e),o=s.sibling}else o=s.child;if(o!==null)o.return=s;else for(o=s;o!==null;){if(o===e){o=null;break}if(s=o.sibling,s!==null){s.return=o.return,o=s;break}o=o.return}s=o}Kt(t,e,r.children,n),e=e.child}return e;case 9:return r=e.type,i=e.pendingProps.children,As(e,n),r=Dn(r),i=i(r),e.flags|=1,Kt(t,e,i,n),e.child;case 14:return i=e.type,r=Bn(i,e.pendingProps),r=Bn(i.type,r),Oh(t,e,i,r,n);case 15:return G0(t,e,e.type,e.pendingProps,n);case 17:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Bn(i,r),ol(t,e),e.tag=1,on(i)?(t=!0,Ml(e)):t=!1,As(e,n),B0(e,i,r),ad(e,i,r,n),ud(null,e,i,!0,t,n);case 19:return Y0(t,e,n);case 22:return j0(t,e,n)}throw Error(se(156,e.tag))};function uv(t,e){return Og(t,e)}function Py(t,e,n,i){this.tag=t,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function bn(t,e,n,i){return new Py(t,e,n,i)}function Mf(t){return t=t.prototype,!(!t||!t.isReactComponent)}function Ly(t){if(typeof t=="function")return Mf(t)?1:0;if(t!=null){if(t=t.$$typeof,t===Bd)return 11;if(t===Hd)return 14}return 2}function tr(t,e){var n=t.alternate;return n===null?(n=bn(t.tag,e,t.key,t.mode),n.elementType=t.elementType,n.type=t.type,n.stateNode=t.stateNode,n.alternate=t,t.alternate=n):(n.pendingProps=e,n.type=t.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=t.flags&14680064,n.childLanes=t.childLanes,n.lanes=t.lanes,n.child=t.child,n.memoizedProps=t.memoizedProps,n.memoizedState=t.memoizedState,n.updateQueue=t.updateQueue,e=t.dependencies,n.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},n.sibling=t.sibling,n.index=t.index,n.ref=t.ref,n}function cl(t,e,n,i,r,s){var o=2;if(i=t,typeof t=="function")Mf(t)&&(o=1);else if(typeof t=="string")o=5;else e:switch(t){case us:return Pr(n.children,r,s,e);case zd:o=8,r|=8;break;case Lu:return t=bn(12,n,e,r|2),t.elementType=Lu,t.lanes=s,t;case Nu:return t=bn(13,n,e,r),t.elementType=Nu,t.lanes=s,t;case Du:return t=bn(19,n,e,r),t.elementType=Du,t.lanes=s,t;case yg:return ic(n,r,s,e);default:if(typeof t=="object"&&t!==null)switch(t.$$typeof){case _g:o=10;break e;case xg:o=9;break e;case Bd:o=11;break e;case Hd:o=14;break e;case ki:o=16,i=null;break e}throw Error(se(130,t==null?t:typeof t,""))}return e=bn(o,n,e,r),e.elementType=t,e.type=i,e.lanes=s,e}function Pr(t,e,n,i){return t=bn(7,t,i,e),t.lanes=n,t}function ic(t,e,n,i){return t=bn(22,t,i,e),t.elementType=yg,t.lanes=n,t.stateNode={isHidden:!1},t}function Gc(t,e,n){return t=bn(6,t,null,e),t.lanes=n,t}function jc(t,e,n){return e=bn(4,t.children!==null?t.children:[],t.key,e),e.lanes=n,e.stateNode={containerInfo:t.containerInfo,pendingChildren:null,implementation:t.implementation},e}function Ny(t,e,n,i,r){this.tag=e,this.containerInfo=t,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Tc(0),this.expirationTimes=Tc(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Tc(0),this.identifierPrefix=i,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function Ef(t,e,n,i,r,s,o,a,l){return t=new Ny(t,e,n,a,l),e===1?(e=1,s===!0&&(e|=8)):e=0,s=bn(3,null,null,e),t.current=s,s.stateNode=t,s.memoizedState={element:i,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},of(s),t}function Dy(t,e,n){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:cs,key:i==null?null:""+i,children:t,containerInfo:e,implementation:n}}function dv(t){if(!t)return sr;t=t._reactInternals;e:{if(Or(t)!==t||t.tag!==1)throw Error(se(170));var e=t;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(on(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(se(171))}if(t.tag===1){var n=t.type;if(on(n))return d0(t,n,e)}return e}function fv(t,e,n,i,r,s,o,a,l){return t=Ef(n,i,!0,t,r,s,o,a,l),t.context=dv(null),n=t.current,i=Qt(),r=er(n),s=yi(i,r),s.callback=e??null,Qi(n,s,r),t.current.lanes=r,ia(t,r,i),an(t,i),t}function rc(t,e,n,i){var r=e.current,s=Qt(),o=er(r);return n=dv(n),e.context===null?e.context=n:e.pendingContext=n,e=yi(s,o),e.payload={element:t},i=i===void 0?null:i,i!==null&&(e.callback=i),t=Qi(r,e,o),t!==null&&(Xn(t,r,o,s),il(t,r,o)),o}function Ul(t){if(t=t.current,!t.child)return null;switch(t.child.tag){case 5:return t.child.stateNode;default:return t.child.stateNode}}function qh(t,e){if(t=t.memoizedState,t!==null&&t.dehydrated!==null){var n=t.retryLane;t.retryLane=n!==0&&n<e?n:e}}function Tf(t,e){qh(t,e),(t=t.alternate)&&qh(t,e)}function Iy(){return null}var hv=typeof reportError=="function"?reportError:function(t){console.error(t)};function wf(t){this._internalRoot=t}sc.prototype.render=wf.prototype.render=function(t){var e=this._internalRoot;if(e===null)throw Error(se(409));rc(t,e,null,null)};sc.prototype.unmount=wf.prototype.unmount=function(){var t=this._internalRoot;if(t!==null){this._internalRoot=null;var e=t.containerInfo;Ur(function(){rc(null,t,null,null)}),e[Ti]=null}};function sc(t){this._internalRoot=t}sc.prototype.unstable_scheduleHydration=function(t){if(t){var e=jg();t={blockedOn:null,target:t,priority:e};for(var n=0;n<Hi.length&&e!==0&&e<Hi[n].priority;n++);Hi.splice(n,0,t),n===0&&Xg(t)}};function Af(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)}function oc(t){return!(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11&&(t.nodeType!==8||t.nodeValue!==" react-mount-point-unstable "))}function Kh(){}function Uy(t,e,n,i,r){if(r){if(typeof i=="function"){var s=i;i=function(){var c=Ul(o);s.call(c)}}var o=fv(e,i,t,0,null,!1,!1,"",Kh);return t._reactRootContainer=o,t[Ti]=o.current,Go(t.nodeType===8?t.parentNode:t),Ur(),o}for(;r=t.lastChild;)t.removeChild(r);if(typeof i=="function"){var a=i;i=function(){var c=Ul(l);a.call(c)}}var l=Ef(t,0,!1,null,null,!1,!1,"",Kh);return t._reactRootContainer=l,t[Ti]=l.current,Go(t.nodeType===8?t.parentNode:t),Ur(function(){rc(e,l,n,i)}),l}function ac(t,e,n,i,r){var s=n._reactRootContainer;if(s){var o=s;if(typeof r=="function"){var a=r;r=function(){var l=Ul(o);a.call(l)}}rc(e,o,t,r)}else o=Uy(n,e,t,r,i);return Ul(o)}Vg=function(t){switch(t.tag){case 3:var e=t.stateNode;if(e.current.memoizedState.isDehydrated){var n=yo(e.pendingLanes);n!==0&&(jd(e,n|1),an(e,xt()),!(Ke&6)&&(Os=xt()+500,ur()))}break;case 13:Ur(function(){var i=wi(t,1);if(i!==null){var r=Qt();Xn(i,t,1,r)}}),Tf(t,1)}};Wd=function(t){if(t.tag===13){var e=wi(t,134217728);if(e!==null){var n=Qt();Xn(e,t,134217728,n)}Tf(t,134217728)}};Gg=function(t){if(t.tag===13){var e=er(t),n=wi(t,e);if(n!==null){var i=Qt();Xn(n,t,e,i)}Tf(t,e)}};jg=function(){return nt};Wg=function(t,e){var n=nt;try{return nt=t,e()}finally{nt=n}};Gu=function(t,e,n){switch(e){case"input":if(Fu(t,n),e=n.name,n.type==="radio"&&e!=null){for(n=t;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<n.length;e++){var i=n[e];if(i!==t&&i.form===t.form){var r=Zl(i);if(!r)throw Error(se(90));Mg(i),Fu(i,r)}}}break;case"textarea":Tg(t,n);break;case"select":e=n.value,e!=null&&Ms(t,!!n.multiple,e,!1)}};Lg=xf;Ng=Ur;var Fy={usingClientEntryPoint:!1,Events:[sa,ps,Zl,bg,Pg,xf]},lo={findFiberByHostInstance:Tr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Oy={bundleType:lo.bundleType,version:lo.version,rendererPackageName:lo.rendererPackageName,rendererConfig:lo.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Ci.ReactCurrentDispatcher,findHostInstanceByFiber:function(t){return t=Ug(t),t===null?null:t.stateNode},findFiberByHostInstance:lo.findFiberByHostInstance||Iy,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var wa=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!wa.isDisabled&&wa.supportsFiber)try{$l=wa.inject(Oy),ni=wa}catch{}}xn.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Fy;xn.createPortal=function(t,e){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Af(e))throw Error(se(200));return Dy(t,e,null,n)};xn.createRoot=function(t,e){if(!Af(t))throw Error(se(299));var n=!1,i="",r=hv;return e!=null&&(e.unstable_strictMode===!0&&(n=!0),e.identifierPrefix!==void 0&&(i=e.identifierPrefix),e.onRecoverableError!==void 0&&(r=e.onRecoverableError)),e=Ef(t,1,!1,null,null,n,!1,i,r),t[Ti]=e.current,Go(t.nodeType===8?t.parentNode:t),new wf(e)};xn.findDOMNode=function(t){if(t==null)return null;if(t.nodeType===1)return t;var e=t._reactInternals;if(e===void 0)throw typeof t.render=="function"?Error(se(188)):(t=Object.keys(t).join(","),Error(se(268,t)));return t=Ug(e),t=t===null?null:t.stateNode,t};xn.flushSync=function(t){return Ur(t)};xn.hydrate=function(t,e,n){if(!oc(e))throw Error(se(200));return ac(null,t,e,!0,n)};xn.hydrateRoot=function(t,e,n){if(!Af(t))throw Error(se(405));var i=n!=null&&n.hydratedSources||null,r=!1,s="",o=hv;if(n!=null&&(n.unstable_strictMode===!0&&(r=!0),n.identifierPrefix!==void 0&&(s=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),e=fv(e,null,t,1,n??null,r,!1,s,o),t[Ti]=e.current,Go(t),i)for(t=0;t<i.length;t++)n=i[t],r=n._getVersion,r=r(n._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[n,r]:e.mutableSourceEagerHydrationData.push(n,r);return new sc(e)};xn.render=function(t,e,n){if(!oc(e))throw Error(se(200));return ac(null,t,e,!1,n)};xn.unmountComponentAtNode=function(t){if(!oc(t))throw Error(se(40));return t._reactRootContainer?(Ur(function(){ac(null,null,t,!1,function(){t._reactRootContainer=null,t[Ti]=null})}),!0):!1};xn.unstable_batchedUpdates=xf;xn.unstable_renderSubtreeIntoContainer=function(t,e,n,i){if(!oc(n))throw Error(se(200));if(t==null||t._reactInternals===void 0)throw Error(se(38));return ac(t,e,n,!1,i)};xn.version="18.3.1-next-f1338f8080-20240426";function pv(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(pv)}catch(t){console.error(t)}}pv(),pg.exports=xn;var ky=pg.exports,mv,Zh=ky;mv=Zh.createRoot,Zh.hydrateRoot;const zy={},Qh=t=>{let e;const n=new Set,i=(f,d)=>{const h=typeof f=="function"?f(e):f;if(!Object.is(h,e)){const p=e;e=d??(typeof h!="object"||h===null)?h:Object.assign({},e,h),n.forEach(g=>g(e,p))}},r=()=>e,l={setState:i,getState:r,getInitialState:()=>c,subscribe:f=>(n.add(f),()=>n.delete(f)),destroy:()=>{(zy?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),n.clear()}},c=e=t(i,r,l);return l},By=t=>t?Qh(t):Qh;var gv={exports:{}},vv={},_v={exports:{}},xv={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ks=J;function Hy(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Vy=typeof Object.is=="function"?Object.is:Hy,Gy=ks.useState,jy=ks.useEffect,Wy=ks.useLayoutEffect,Xy=ks.useDebugValue;function $y(t,e){var n=e(),i=Gy({inst:{value:n,getSnapshot:e}}),r=i[0].inst,s=i[1];return Wy(function(){r.value=n,r.getSnapshot=e,Wc(r)&&s({inst:r})},[t,n,e]),jy(function(){return Wc(r)&&s({inst:r}),t(function(){Wc(r)&&s({inst:r})})},[t]),Xy(n),n}function Wc(t){var e=t.getSnapshot;t=t.value;try{var n=e();return!Vy(t,n)}catch{return!0}}function Yy(t,e){return e()}var qy=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?Yy:$y;xv.useSyncExternalStore=ks.useSyncExternalStore!==void 0?ks.useSyncExternalStore:qy;_v.exports=xv;var Ky=_v.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var lc=J,Zy=Ky;function Qy(t,e){return t===e&&(t!==0||1/t===1/e)||t!==t&&e!==e}var Jy=typeof Object.is=="function"?Object.is:Qy,eS=Zy.useSyncExternalStore,tS=lc.useRef,nS=lc.useEffect,iS=lc.useMemo,rS=lc.useDebugValue;vv.useSyncExternalStoreWithSelector=function(t,e,n,i,r){var s=tS(null);if(s.current===null){var o={hasValue:!1,value:null};s.current=o}else o=s.current;s=iS(function(){function l(p){if(!c){if(c=!0,f=p,p=i(p),r!==void 0&&o.hasValue){var g=o.value;if(r(g,p))return d=g}return d=p}if(g=d,Jy(f,p))return g;var x=i(p);return r!==void 0&&r(g,x)?(f=p,g):(f=p,d=x)}var c=!1,f,d,h=n===void 0?null:n;return[function(){return l(e())},h===null?void 0:function(){return l(h())}]},[e,n,i,r]);var a=eS(t,s[0],s[1]);return nS(function(){o.hasValue=!0,o.value=a},[a]),rS(a),a};gv.exports=vv;var sS=gv.exports;const oS=ng(sS),yv={},{useDebugValue:aS}=C_,{useSyncExternalStoreWithSelector:lS}=oS;let Jh=!1;const cS=t=>t;function uS(t,e=cS,n){(yv?"production":void 0)!=="production"&&n&&!Jh&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),Jh=!0);const i=lS(t.subscribe,t.getState,t.getServerState||t.getInitialState,e,n);return aS(i),i}const ep=t=>{(yv?"production":void 0)!=="production"&&typeof t!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const e=typeof t=="function"?By(t):t,n=(i,r)=>uS(e,i,r);return Object.assign(n,e),n},Cf=t=>t?ep(t):ep,dS=1.2,tp=.07,Fl=.13,mn=.36,as={R2:1.341,R3:1.285,R4:1.06,R5:.803,R6:1.341},ul=Math.PI*(100/180),Xi=["R1","R2","R3","R4","R5","R6","R7"],Nt=[{id:"J1",label:"CUBE L",type:"twist",bodyA:"R1",bodyB:"R2",limit:Math.PI},{id:"J2",label:"JOINT 1",type:"bend",bodyA:"R2",bodyB:"R3",limit:ul},{id:"J3",label:"JOINT 2",type:"bend",bodyA:"R3",bodyB:"R4",limit:ul},{id:"J4",label:"WRIST",type:"twist",bodyA:"R4",bodyB:"R5",limit:Math.PI},{id:"J5",label:"JOINT 3",type:"bend",bodyA:"R5",bodyB:"R6",limit:ul},{id:"J6",label:"CUBE R",type:"twist",bodyA:"R6",bodyB:"R7",limit:Math.PI}],fS=()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}),pn=Cf((t,e)=>({activeRootId:"R1",jointAngles:[0,0,0,0,0,0],joints:Array.from({length:6},fS),isDragging:!1,status:"idle",endEffectorPosition:{x:0,y:0,z:0},reachPercent:0,pendingHome:!1,mode:"horizontal",setRootRod:n=>{n!==e().activeRootId&&t({activeRootId:n})},setRootAndAngles:(n,i)=>{const r=i.map((s,o)=>{const a=Nt[o].limit;return Math.max(-a,Math.min(a,s))});t({activeRootId:n,jointAngles:r})},setJointAngle:(n,i)=>{const r=Nt[n].limit,s=Math.max(-r,Math.min(r,i)),o=[...e().jointAngles];o[n]=s,t({jointAngles:o})},setJointTelemetry:n=>t({joints:n}),setStatus:n=>t({status:n}),updateEndEffector:(n,i)=>t({endEffectorPosition:n,reachPercent:i}),homeArm:()=>t({pendingHome:!0}),clearPendingHome:()=>t({pendingHome:!1}),setMode:n=>t({mode:n}),collision:!1,setCollision:n=>t({collision:n}),setAllAngles:n=>{const i=n.map((r,s)=>{const o=Nt[s].limit;return Math.max(-o,Math.min(o,r))});t({jointAngles:i})}}));let hS=1;const np=(t,e,n=0)=>({id:t,label:e,angles:[0,0,0,0,0,0],activeRootId:"R1",position:{x:0,y:0,z:n},quaternion:{x:0,y:0,z:0,w:1},mode:"horizontal"}),qe=Cf((t,e)=>({modules:[np("module-0","Module 1",0)],activeModuleId:"module-0",connectMode:!1,face1:null,face2:null,connectError:null,deleteMode:!1,setDeleteMode(n){t({deleteMode:n})},disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null,removeModule(n){const{modules:i,activeModuleId:r}=e();if(i.length<=1)return;const s=i.filter(a=>a.id!==n).map((a,l)=>({...a,label:`Module ${l+1}`})),o=r===n?s[0].id:r;t({modules:s,activeModuleId:o})},addModule(){const n=e().modules,i=new Set(n.map(l=>Math.round(l.position.z/4)));let r=0;for(;i.has(r);)r++;const s=`module-${hS++}`,o=`Module ${n.length+1}`,a=r*4;return t(l=>({modules:[...l.modules,np(s,o,a)]})),s},setActiveModule(n){t({activeModuleId:n})},saveModuleState(n,{angles:i,activeRootId:r,position:s,quaternion:o,mode:a}){t(l=>({modules:l.modules.map(c=>c.id===n?{...c,angles:i,activeRootId:r,position:s,quaternion:o,mode:a}:c)}))},setConnectMode(n){t({connectMode:n,face1:null,face2:null,connectError:null})},setDisconnectMode(n){t({disconnectMode:n,dSel1:null,dSel2:null,disconnectError:null})},setDSel1(n){t({dSel1:n,disconnectError:null})},setDSel2(n){t({dSel2:n,disconnectError:null})},clearDSelections(){t({dSel1:null,dSel2:null,disconnectError:null})},setDisconnectError(n){t({disconnectError:n})},applyDisconnect(n){t(i=>{const r=new Set(i.modules.filter(o=>o.id!==n).map(o=>Math.round(o.position.z/4)));let s=0;for(;r.has(s);)s++;return{modules:i.modules.map(o=>o.id===n?{...o,position:{x:0,y:0,z:s*4},quaternion:{x:0,y:0,z:0,w:1}}:o),disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null}})},setFace1(n){t({face1:n,connectError:null})},setFace2(n){t({face2:n,connectError:null})},clearFaces(){t({face1:null,face2:null,connectError:null})},setConnectError(n){t({connectError:n})},applyJoin(n,i,r){t(s=>({modules:s.modules.map(o=>o.id===n?{...o,position:{x:i.x,y:i.y,z:i.z},quaternion:{x:r.x,y:r.y,z:r.z,w:r.w}}:o),connectMode:!1,face1:null,face2:null,connectError:null}))}})),Qo=180/Math.PI,Sv=Math.PI/180,ip=[{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"},{main:"#0088ff",glow:"#0088ff33",track:"#d0e8ff",neg:"#cc3344"},{main:"#9944ff",glow:"#9944ff33",track:"#e8d8ff",neg:"#cc3344"},{main:"#00aabb",glow:"#00aabb33",track:"#ccf0f4",neg:"#cc3344"},{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"}];function rp({value:t,format:e,className:n,style:i}){const r=J.useRef(null),s=J.useRef(t),o=J.useRef(null);return J.useEffect(()=>{const a=t,l=()=>{s.current+=(a-s.current)*.14,r.current&&(r.current.textContent=e(s.current)),Math.abs(a-s.current)>.005&&(o.current=requestAnimationFrame(l))};return o.current=requestAnimationFrame(l),()=>{o.current&&cancelAnimationFrame(o.current)}},[t,e]),y.jsx("span",{ref:r,className:n,style:i,children:e(t)})}function pS({rawAngle:t,palette:e,panelIdx:n,limit:i,onJointSet:r}){const[s,o]=J.useState(!1),[a,l]=J.useState(""),c=J.useRef(null),f=(t*Qo+180).toFixed(1),d=J.useCallback(()=>{l((t*Qo+180).toFixed(1)),o(!0)},[t]);J.useEffect(()=>{s&&c.current&&(c.current.focus(),c.current.select())},[s]);const h=J.useCallback(()=>{const g=parseFloat(a);if(!isNaN(g)&&r){const x=(g-180)*Sv,m=Math.max(-i,Math.min(i,x));r(n,m)}o(!1)},[a,r,n,i]),p=J.useCallback(g=>{g.key==="Enter"&&(g.preventDefault(),h()),g.key==="Escape"&&o(!1)},[h]);return s?y.jsx("input",{ref:c,className:"angle-input editing",style:{color:e==null?void 0:e.main},type:"text",value:a,onChange:g=>l(g.target.value),onBlur:h,onKeyDown:p}):y.jsxs("span",{className:"stat-val angle-input-display",style:{color:e==null?void 0:e.main,cursor:"text"},title:"Click to set angle (80–280° bend · 0–360° twist)",onClick:d,children:[f,"°"]})}function mS({angle:t,rawAngle:e,limit:n,limitHit:i,palette:r,panelIdx:s,onDrag:o}){const d=J.useRef(null),h=J.useRef(!1),p=J.useRef(null);J.useEffect(()=>()=>{p.current&&cancelAnimationFrame(p.current)},[]);const g=i?"#ffdddd":(r==null?void 0:r.track)??"#d0e8ff",x=i?(r==null?void 0:r.neg)??"#cc3344":(r==null?void 0:r.main)??"#0088ff",m=i?"#ff5533":(r==null?void 0:r.main)??"#0088ff",u=h.current?e??t:t;function v(V,z,O=1){const Z=be=>(be-90)*(Math.PI/180),I=44+36*Math.cos(Z(V)),G=44+36*Math.sin(Z(V)),X=44+36*Math.cos(Z(z)),ee=44+36*Math.sin(Z(z)),ue=Math.abs(z-V)>180?1:0;return`M ${I} ${G} A 36 36 0 ${ue} ${O} ${X} ${ee}`}const _=n*180/Math.PI,M=u*180/Math.PI,b=Math.max(-_,Math.min(_,M)),C=(b-90)*(Math.PI/180),A=44+36*Math.cos(C),L=44+36*Math.sin(C),T=J.useCallback(V=>{const z=d.current;if(!z)return 0;const O=z.getBoundingClientRect(),Z=V.clientX-O.left,I=V.clientY-O.top,G=Math.atan2(Z-44,-(I-44))*Qo;return Math.max(-n,Math.min(n,G*Sv))},[44,44,n]),S=J.useCallback(V=>{if(V.currentTarget.setPointerCapture(V.pointerId),h.current=!0,!o)return;const z=T(V),O=e??t;p.current&&(cancelAnimationFrame(p.current),p.current=null);const Z=performance.now(),I=220,G=()=>{const X=Math.min((performance.now()-Z)/I,1),ee=X<.5?2*X*X:-1+(4-2*X)*X;o(s,O+(z-O)*ee),X<1?p.current=requestAnimationFrame(G):p.current=null};p.current=requestAnimationFrame(G)},[o,s,T,e,t]),U=J.useCallback(V=>{!h.current||!o||(p.current&&(cancelAnimationFrame(p.current),p.current=null),o(s,T(V)))},[o,s,T]),k=J.useCallback(()=>{h.current=!1},[]),D=!!o;return y.jsxs("svg",{ref:d,width:88,height:88,style:{flexShrink:0,cursor:D?"crosshair":"default",touchAction:"none"},onPointerDown:D?S:void 0,onPointerMove:D?U:void 0,onPointerUp:D?k:void 0,children:[D&&y.jsx("circle",{cx:44,cy:44,r:44,fill:"transparent"}),y.jsx("path",{d:v(-_,_),fill:"none",stroke:g,strokeWidth:"5",strokeLinecap:"round"}),y.jsx("circle",{cx:44+36*Math.cos((-_-90)*Math.PI/180),cy:44+36*Math.sin((-_-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),y.jsx("circle",{cx:44+36*Math.cos((_-90)*Math.PI/180),cy:44+36*Math.sin((_-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),y.jsx("line",{x1:44,y1:12,x2:44,y2:19,stroke:(r==null?void 0:r.main)??"#0088ff",strokeWidth:"2",opacity:"0.7"}),Math.abs(b)>.5&&y.jsx("path",{d:v(0,b,b>=0?1:0),fill:"none",stroke:x,strokeWidth:"4.5",strokeLinecap:"round",style:{filter:i?"none":`drop-shadow(0 0 4px ${x}88)`}}),y.jsx("circle",{cx:A,cy:L,r:D?6:4.5,fill:m,style:{filter:`drop-shadow(0 0 5px ${m})`}}),y.jsxs("text",{x:44,y:49,textAnchor:"middle",fontSize:"10",fontFamily:"monospace",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.85",children:[(180+b).toFixed(0),"°"]})]})}function gS({velocity:t}){const e=Math.abs(t),n=t>=0?"→":"←",i=Math.min(e/5,1),r=Math.round(i*5),s=e>3?"#ffaa00":"#00aaff";return y.jsxs("div",{className:"vel-arrow",children:[y.jsx("span",{className:"vel-dir",style:{color:s},children:n}),y.jsx("span",{className:"vel-bars",children:Array.from({length:5},(o,a)=>y.jsx("span",{className:"vel-bar",style:{opacity:a<r?1:.15,background:s}},a))})]})}function vS({joint:t,index:e,rawAngle:n,onArcDrag:i,onJointHome:r,onJointSet:s,collision:o=!1}){const{angle:a=0,velocity:l=0,acceleration:c=0,limitHit:f=!1}=t??{},d=Nt[e],h=ip[e]??ip[1],p=(d==null?void 0:d.type)==="twist",g=(d==null?void 0:d.limit)??Math.PI,x=(d==null?void 0:d.label)??`JOINT ${e+1}`;return y.jsxs("div",{className:`joint-card ${f?"limit-hit":""} ${o?"collision-hit":""}`,style:{"--joint-color":h.main,"--joint-glow":h.glow},children:[y.jsx("div",{className:"joint-accent"}),y.jsxs("div",{className:"joint-header",children:[y.jsx("span",{className:"joint-label",style:{color:h.main},children:x}),y.jsxs("div",{className:"joint-header-right",children:[o&&y.jsx("span",{className:"collision-badge",children:"COLL"}),f&&!p&&y.jsx("span",{className:"limit-badge",children:"LIMIT"}),r&&y.jsx("button",{className:"joint-home-btn",onClick:()=>r(e),title:`Reset ${x} to home (180°)`,style:{"--joint-color":h.main},children:"↺"})]})]}),y.jsxs("div",{className:"joint-body",children:[y.jsx(mS,{angle:a,rawAngle:n,limit:g,limitHit:f&&!p,palette:h,panelIdx:e,onDrag:i}),y.jsxs("div",{className:"joint-stats",children:[y.jsxs("div",{className:"stat-row",children:[y.jsx("span",{className:"stat-key",children:"ANG"}),y.jsx(pS,{rawAngle:n??a,palette:h,panelIdx:e,limit:g,onJointSet:s})]}),y.jsxs("div",{className:"stat-row",children:[y.jsx("span",{className:"stat-key",children:"VEL"}),y.jsxs("div",{className:"stat-val-group",children:[y.jsx(rp,{value:l*Qo,format:m=>`${Math.abs(m).toFixed(1)}°/s`,className:"stat-val"}),y.jsx(gS,{velocity:l})]})]}),y.jsxs("div",{className:"stat-row",children:[y.jsx("span",{className:"stat-key",children:"ACC"}),y.jsx(rp,{value:c*Qo,format:m=>`${m>=0?"+":""}${m.toFixed(0)}°/s²`,className:`stat-val ${Math.abs(c)>5?"accent":""}`})]})]})]})]})}function _S(){var U,k,D,V,z;const t=pn(O=>O.joints),e=pn(O=>O.activeRootId),n=pn(O=>O.jointAngles),i=pn(O=>O.homeArm),r=pn(O=>O.setJointAngle),s=pn(O=>O.collision),o=qe(O=>O.modules),a=qe(O=>O.activeModuleId),l=qe(O=>O.setActiveModule),c=qe(O=>O.addModule);qe(O=>O.removeModule);const f=qe(O=>O.deleteMode),d=qe(O=>O.setDeleteMode),h=qe(O=>O.connectMode),p=qe(O=>O.setConnectMode),g=qe(O=>O.face1),x=qe(O=>O.face2),m=qe(O=>O.connectError),u=qe(O=>O.clearFaces),v=qe(O=>O.disconnectMode),_=qe(O=>O.setDisconnectMode),M=qe(O=>O.dSel1),b=qe(O=>O.dSel2),C=qe(O=>O.disconnectError),A=qe(O=>O.clearDSelections),L=Xi.indexOf(e),T=O=>L>O?-1:1,S=((U=o.find(O=>O.id===a))==null?void 0:U.label)??"Module 1";return y.jsxs("aside",{className:"left-panel fade-in",children:[y.jsxs("div",{className:"panel-header",children:[y.jsxs("div",{className:"panel-logo",children:[y.jsx("span",{className:"logo-main",children:"TETROBOT"}),y.jsx("span",{className:"logo-sub",children:"CONTROL SIMULATOR"})]}),y.jsx("div",{className:"panel-status-dot"})]}),o.length>1&&y.jsxs("div",{className:"section",children:[y.jsx("div",{className:"section-title",children:"ACTIVE MODULE"}),y.jsx("select",{className:"module-select",value:a,onChange:O=>l(O.target.value),children:o.map(O=>y.jsx("option",{value:O.id,children:O.label},O.id))})]}),y.jsxs("div",{className:"section module-actions",children:[y.jsxs("button",{className:`delete-module-btn${f?" delete-module-btn--active":""}`,onClick:()=>d(!f),disabled:o.length<=1,title:o.length<=1?"Cannot delete — at least one module required":"Click a module in the viewport to delete it",children:[y.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:y.jsx("path",{d:"M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})}),f?"CANCEL DELETE":"DELETE MODULE"]}),y.jsxs("button",{className:"add-module-btn",onClick:c,title:"Add a new arm module to the scene",children:[y.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:y.jsx("path",{d:"M8 2v12M2 8h12",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round"})}),"ADD MODULE"]}),y.jsxs("button",{className:`connect-btn${h?" connect-btn--active":""}`,onClick:()=>{p(!h),v&&_(!1)},title:"Select end-faces on two modules to join them",children:[y.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[y.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),y.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),y.jsx("path",{d:"M5 8h6",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeDasharray:"2 1.5"})]}),h?"CANCEL CONNECT":"CONNECT MODULES"]}),y.jsxs("button",{className:`connect-btn disconnect-btn${v?" connect-btn--active disconnect-btn--active":""}`,onClick:()=>{_(!v),h&&p(!1)},title:"Click two modules to separate them",children:[y.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[y.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),y.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),y.jsx("path",{d:"M5.5 6.5l5-3M5.5 9.5l5 3",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]}),v?"CANCEL DISCONNECT":"DISCONNECT MODULES"]})]}),f&&y.jsxs("div",{className:"section connect-status disconnect-status",children:[y.jsx("div",{className:"section-title",children:"DELETE MODULE"}),y.jsx("p",{className:"connect-hint",children:"Click on any part of the module you want to delete in the 3D viewport."})]}),h&&y.jsxs("div",{className:"section connect-status",children:[y.jsx("div",{className:"section-title",children:"FACE SELECTION"}),y.jsx("p",{className:"connect-hint",children:"Click a square end-face on a module to select it. Two faces from different modules will join them."}),y.jsxs("div",{className:"face-slots",children:[y.jsxs("div",{className:`face-slot face-slot--1${g?" face-slot--set":""}`,children:[y.jsx("span",{className:"face-slot-label",children:"FACE A"}),y.jsx("span",{className:"face-slot-value",children:g?`${((k=o.find(O=>O.id===g.moduleId))==null?void 0:k.label)??"?"} · ${g.faceKey}`:"not selected"})]}),y.jsxs("div",{className:`face-slot face-slot--2${x?" face-slot--set":""}`,children:[y.jsx("span",{className:"face-slot-label",children:"FACE B"}),y.jsx("span",{className:"face-slot-value",children:x?`${((D=o.find(O=>O.id===x.moduleId))==null?void 0:D.label)??"?"} · ${x.faceKey}`:"not selected"})]})]}),m&&y.jsx("div",{className:"connect-error",children:m}),g&&y.jsx("button",{className:"clear-faces-btn",onClick:u,children:"CLEAR SELECTION"})]}),v&&y.jsxs("div",{className:"section connect-status disconnect-status",children:[y.jsx("div",{className:"section-title",children:"DISCONNECT SELECTION"}),y.jsx("p",{className:"connect-hint",children:"Click on any part of a module to select it. Select two different modules to separate them."}),y.jsxs("div",{className:"face-slots",children:[y.jsxs("div",{className:`face-slot face-slot--1${M?" face-slot--set":""}`,children:[y.jsx("span",{className:"face-slot-label",children:"MOD A"}),y.jsx("span",{className:"face-slot-value",children:M?((V=o.find(O=>O.id===M))==null?void 0:V.label)??"?":"not selected"})]}),y.jsxs("div",{className:`face-slot face-slot--2${b?" face-slot--set":""}`,children:[y.jsx("span",{className:"face-slot-label",children:"MOD B"}),y.jsx("span",{className:"face-slot-value",children:b?((z=o.find(O=>O.id===b))==null?void 0:z.label)??"?":"not selected"})]})]}),C&&y.jsx("div",{className:"connect-error",children:C}),M&&!b&&y.jsx("button",{className:"clear-faces-btn",onClick:A,children:"CLEAR SELECTION"})]}),y.jsxs("div",{className:"section",children:[y.jsx("div",{className:"section-title",children:S}),y.jsxs("button",{className:"home-btn",onClick:i,title:"Reset arm to home position",children:[y.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 20 20",fill:"none",children:[y.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"}),y.jsx("rect",{x:"8",y:"12",width:"4",height:"6",rx:"0.5",stroke:"currentColor",strokeWidth:"1.5",fill:"none"})]}),"HOME"]})]}),y.jsxs("div",{className:"section",children:[y.jsx("div",{className:"section-title",children:"FIXED ROOT"}),y.jsxs("div",{className:"root-info",children:[y.jsxs("div",{className:"root-indicator",children:[y.jsx("span",{className:"root-glow-dot"}),y.jsx("span",{className:"root-name",children:e}),y.jsx("span",{className:"root-badge",children:"ROOT"})]}),y.jsx("p",{className:"root-hint",children:"Click a rod in the viewport to set it as the fixed root."})]})]}),y.jsxs("div",{className:"section",children:[y.jsx("div",{className:"section-title",children:"JOINT TELEMETRY"}),y.jsx("div",{className:"joint-list",children:t.map((O,Z)=>y.jsx(vS,{joint:{...O,angle:O.angle*T(Z),velocity:O.velocity*T(Z),acceleration:O.acceleration*T(Z)},index:Z,rawAngle:n[Z]*T(Z),onArcDrag:(I,G)=>r(I,G*T(I)),onJointHome:I=>r(I,0),onJointSet:(I,G)=>r(I,G*T(I)),collision:s},Z))})]}),y.jsxs("div",{className:"instructions",children:[y.jsx("div",{className:"section-title",children:"CONTROLS"}),y.jsxs("ul",{children:[y.jsxs("li",{children:[y.jsx("kbd",{children:"Drag"})," any rod in viewport → IK follows cursor"]}),y.jsxs("li",{children:[y.jsx("kbd",{children:"Click"})," a rod to set as root"]}),y.jsxs("li",{children:[y.jsx("kbd",{children:"Arc"})," drag in panel to set joint angle"]}),y.jsxs("li",{children:[y.jsx("kbd",{children:"ANG"})," input — type degrees, press Enter"]}),y.jsxs("li",{children:[y.jsx("kbd",{children:"Scroll"})," to zoom, ",y.jsx("kbd",{children:"RMB"})," to orbit"]})]})]}),y.jsxs("div",{className:"panel-footer",children:[y.jsx("span",{children:"BEND 80–280°"}),y.jsx("span",{children:"TWIST 0–360°"}),y.jsxs("span",{children:[o.length," MODULE",o.length>1?"S":""," · 6 JOINTS"]})]})]})}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Rf="164",Hr={ROTATE:0,DOLLY:1,PAN:2},Vr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},xS=0,sp=1,yS=2,Mv=1,Ev=2,pi=3,or=0,ln=1,Jn=2,Si=0,Rs=1,Md=2,op=3,ap=4,SS=5,Mr=100,MS=101,ES=102,TS=103,wS=104,AS=200,CS=201,RS=202,bS=203,Ed=204,Td=205,PS=206,LS=207,NS=208,DS=209,IS=210,US=211,FS=212,OS=213,kS=214,zS=0,BS=1,HS=2,Ol=3,VS=4,GS=5,jS=6,WS=7,Tv=0,XS=1,$S=2,nr=0,wv=1,Av=2,Cv=3,bf=4,YS=5,Rv=6,bv=7,Pv=300,zs=301,Bs=302,wd=303,Ad=304,cc=306,Cd=1e3,Cr=1001,Rd=1002,Pn=1003,qS=1004,Aa=1005,jn=1006,Xc=1007,Rr=1008,ar=1009,KS=1010,ZS=1011,Lv=1012,Nv=1013,Hs=1014,$i=1015,ir=1016,Dv=1017,Iv=1018,aa=1020,QS=35902,JS=1021,eM=1022,ti=1023,tM=1024,nM=1025,bs=1026,Jo=1027,iM=1028,Uv=1029,rM=1030,Fv=1031,Ov=1033,$c=33776,Yc=33777,qc=33778,Kc=33779,lp=35840,cp=35841,up=35842,dp=35843,fp=36196,hp=37492,pp=37496,mp=37808,gp=37809,vp=37810,_p=37811,xp=37812,yp=37813,Sp=37814,Mp=37815,Ep=37816,Tp=37817,wp=37818,Ap=37819,Cp=37820,Rp=37821,Zc=36492,bp=36494,Pp=36495,sM=36283,Lp=36284,Np=36285,Dp=36286,oM=3200,aM=3201,kv=0,lM=1,Gi="",Vn="srgb",dr="srgb-linear",Pf="display-p3",uc="display-p3-linear",kl="linear",rt="srgb",zl="rec709",Bl="p3",Gr=7680,Ip=519,cM=512,uM=513,dM=514,zv=515,fM=516,hM=517,pM=518,mM=519,Up=35044,Fp="300 es",xi=2e3,Hl=2001;class kr{addEventListener(e,n){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(n)===-1&&i[e].push(n)}hasEventListener(e,n){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(n)!==-1}removeEventListener(e,n){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(n);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const Gt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Op=1234567;const Do=Math.PI/180,ea=180/Math.PI;function $s(){const t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Gt[t&255]+Gt[t>>8&255]+Gt[t>>16&255]+Gt[t>>24&255]+"-"+Gt[e&255]+Gt[e>>8&255]+"-"+Gt[e>>16&15|64]+Gt[e>>24&255]+"-"+Gt[n&63|128]+Gt[n>>8&255]+"-"+Gt[n>>16&255]+Gt[n>>24&255]+Gt[i&255]+Gt[i>>8&255]+Gt[i>>16&255]+Gt[i>>24&255]).toLowerCase()}function Xt(t,e,n){return Math.max(e,Math.min(n,t))}function Lf(t,e){return(t%e+e)%e}function gM(t,e,n,i,r){return i+(t-e)*(r-i)/(n-e)}function vM(t,e,n){return t!==e?(n-t)/(e-t):0}function Io(t,e,n){return(1-n)*t+n*e}function _M(t,e,n,i){return Io(t,e,1-Math.exp(-n*i))}function xM(t,e=1){return e-Math.abs(Lf(t,e*2)-e)}function yM(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*(3-2*t))}function SM(t,e,n){return t<=e?0:t>=n?1:(t=(t-e)/(n-e),t*t*t*(t*(t*6-15)+10))}function MM(t,e){return t+Math.floor(Math.random()*(e-t+1))}function EM(t,e){return t+Math.random()*(e-t)}function TM(t){return t*(.5-Math.random())}function wM(t){t!==void 0&&(Op=t);let e=Op+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function AM(t){return t*Do}function CM(t){return t*ea}function RM(t){return(t&t-1)===0&&t!==0}function bM(t){return Math.pow(2,Math.ceil(Math.log(t)/Math.LN2))}function PM(t){return Math.pow(2,Math.floor(Math.log(t)/Math.LN2))}function LM(t,e,n,i,r){const s=Math.cos,o=Math.sin,a=s(n/2),l=o(n/2),c=s((e+i)/2),f=o((e+i)/2),d=s((e-i)/2),h=o((e-i)/2),p=s((i-e)/2),g=o((i-e)/2);switch(r){case"XYX":t.set(a*f,l*d,l*h,a*c);break;case"YZY":t.set(l*h,a*f,l*d,a*c);break;case"ZXZ":t.set(l*d,l*h,a*f,a*c);break;case"XZX":t.set(a*f,l*g,l*p,a*c);break;case"YXY":t.set(l*p,a*f,l*g,a*c);break;case"ZYZ":t.set(l*g,l*p,a*f,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function ls(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return t/4294967295;case Uint16Array:return t/65535;case Uint8Array:return t/255;case Int32Array:return Math.max(t/2147483647,-1);case Int16Array:return Math.max(t/32767,-1);case Int8Array:return Math.max(t/127,-1);default:throw new Error("Invalid component type.")}}function Yt(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return Math.round(t*4294967295);case Uint16Array:return Math.round(t*65535);case Uint8Array:return Math.round(t*255);case Int32Array:return Math.round(t*2147483647);case Int16Array:return Math.round(t*32767);case Int8Array:return Math.round(t*127);default:throw new Error("Invalid component type.")}}const Bv={DEG2RAD:Do,RAD2DEG:ea,generateUUID:$s,clamp:Xt,euclideanModulo:Lf,mapLinear:gM,inverseLerp:vM,lerp:Io,damp:_M,pingpong:xM,smoothstep:yM,smootherstep:SM,randInt:MM,randFloat:EM,randFloatSpread:TM,seededRandom:wM,degToRad:AM,radToDeg:CM,isPowerOfTwo:RM,ceilPowerOfTwo:bM,floorPowerOfTwo:PM,setQuaternionFromProperEuler:LM,normalize:Yt,denormalize:ls};class ye{constructor(e=0,n=0){ye.prototype.isVector2=!0,this.x=e,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const n=this.x,i=this.y,r=e.elements;return this.x=r[0]*n+r[3]*i+r[6],this.y=r[1]*n+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,n){return this.x=Math.max(e.x,Math.min(n.x,this.x)),this.y=Math.max(e.y,Math.min(n.y,this.y)),this}clampScalar(e,n){return this.x=Math.max(e,Math.min(n,this.x)),this.y=Math.max(e,Math.min(n,this.y)),this}clampLength(e,n){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;const i=this.dot(e)/n;return Math.acos(Xt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,i=this.y-e.y;return n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this}rotateAround(e,n){const i=Math.cos(n),r=Math.sin(n),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Be{constructor(e,n,i,r,s,o,a,l,c){Be.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,l,c)}set(e,n,i,r,s,o,a,l,c){const f=this.elements;return f[0]=e,f[1]=r,f[2]=a,f[3]=n,f[4]=s,f[5]=l,f[6]=i,f[7]=o,f[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(e,n,i){return e.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const n=e.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],f=i[4],d=i[7],h=i[2],p=i[5],g=i[8],x=r[0],m=r[3],u=r[6],v=r[1],_=r[4],M=r[7],b=r[2],C=r[5],A=r[8];return s[0]=o*x+a*v+l*b,s[3]=o*m+a*_+l*C,s[6]=o*u+a*M+l*A,s[1]=c*x+f*v+d*b,s[4]=c*m+f*_+d*C,s[7]=c*u+f*M+d*A,s[2]=h*x+p*v+g*b,s[5]=h*m+p*_+g*C,s[8]=h*u+p*M+g*A,this}multiplyScalar(e){const n=this.elements;return n[0]*=e,n[3]*=e,n[6]*=e,n[1]*=e,n[4]*=e,n[7]*=e,n[2]*=e,n[5]*=e,n[8]*=e,this}determinant(){const e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],f=e[8];return n*o*f-n*a*c-i*s*f+i*a*l+r*s*c-r*o*l}invert(){const e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],f=e[8],d=f*o-a*c,h=a*l-f*s,p=c*s-o*l,g=n*d+i*h+r*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=d*x,e[1]=(r*c-f*i)*x,e[2]=(a*i-r*o)*x,e[3]=h*x,e[4]=(f*n-r*l)*x,e[5]=(r*s-a*n)*x,e[6]=p*x,e[7]=(i*l-c*n)*x,e[8]=(o*n-i*s)*x,this}transpose(){let e;const n=this.elements;return e=n[1],n[1]=n[3],n[3]=e,e=n[2],n[2]=n[6],n[6]=e,e=n[5],n[5]=n[7],n[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const n=this.elements;return e[0]=n[0],e[1]=n[3],e[2]=n[6],e[3]=n[1],e[4]=n[4],e[5]=n[7],e[6]=n[2],e[7]=n[5],e[8]=n[8],this}setUvTransform(e,n,i,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+n,0,0,1),this}scale(e,n){return this.premultiply(Qc.makeScale(e,n)),this}rotate(e){return this.premultiply(Qc.makeRotation(-e)),this}translate(e,n){return this.premultiply(Qc.makeTranslation(e,n)),this}makeTranslation(e,n){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,n,0,0,1),this}makeRotation(e){const n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(e,n){return this.set(e,0,0,0,n,0,0,0,1),this}equals(e){const n=this.elements,i=e.elements;for(let r=0;r<9;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<9;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){const i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Qc=new Be;function Hv(t){for(let e=t.length-1;e>=0;--e)if(t[e]>=65535)return!0;return!1}function Vl(t){return document.createElementNS("http://www.w3.org/1999/xhtml",t)}function NM(){const t=Vl("canvas");return t.style.display="block",t}const kp={};function DM(t){t in kp||(kp[t]=!0,console.warn(t))}const zp=new Be().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Bp=new Be().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Ca={[dr]:{transfer:kl,primaries:zl,toReference:t=>t,fromReference:t=>t},[Vn]:{transfer:rt,primaries:zl,toReference:t=>t.convertSRGBToLinear(),fromReference:t=>t.convertLinearToSRGB()},[uc]:{transfer:kl,primaries:Bl,toReference:t=>t.applyMatrix3(Bp),fromReference:t=>t.applyMatrix3(zp)},[Pf]:{transfer:rt,primaries:Bl,toReference:t=>t.convertSRGBToLinear().applyMatrix3(Bp),fromReference:t=>t.applyMatrix3(zp).convertLinearToSRGB()}},IM=new Set([dr,uc]),tt={enabled:!0,_workingColorSpace:dr,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(t){if(!IM.has(t))throw new Error(`Unsupported working color space, "${t}".`);this._workingColorSpace=t},convert:function(t,e,n){if(this.enabled===!1||e===n||!e||!n)return t;const i=Ca[e].toReference,r=Ca[n].fromReference;return r(i(t))},fromWorkingColorSpace:function(t,e){return this.convert(t,this._workingColorSpace,e)},toWorkingColorSpace:function(t,e){return this.convert(t,e,this._workingColorSpace)},getPrimaries:function(t){return Ca[t].primaries},getTransfer:function(t){return t===Gi?kl:Ca[t].transfer}};function Ps(t){return t<.04045?t*.0773993808:Math.pow(t*.9478672986+.0521327014,2.4)}function Jc(t){return t<.0031308?t*12.92:1.055*Math.pow(t,.41666)-.055}let jr;class UM{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{jr===void 0&&(jr=Vl("canvas")),jr.width=e.width,jr.height=e.height;const i=jr.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=jr}return n.width>2048||n.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),n.toDataURL("image/jpeg",.6)):n.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const n=Vl("canvas");n.width=e.width,n.height=e.height;const i=n.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Ps(s[o]/255)*255;return i.putImageData(r,0,0),n}else if(e.data){const n=e.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Ps(n[i]/255)*255):n[i]=Ps(n[i]);return{data:n,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let FM=0;class Vv{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:FM++}),this.uuid=$s(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const n=e===void 0||typeof e=="string";if(!n&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(eu(r[o].image)):s.push(eu(r[o]))}else s=eu(r);i.url=s}return n||(e.images[this.uuid]=i),i}}function eu(t){return typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap?UM.getDataURL(t):t.data?{data:Array.from(t.data),width:t.width,height:t.height,type:t.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let OM=0;class cn extends kr{constructor(e=cn.DEFAULT_IMAGE,n=cn.DEFAULT_MAPPING,i=Cr,r=Cr,s=jn,o=Rr,a=ti,l=ar,c=cn.DEFAULT_ANISOTROPY,f=Gi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:OM++}),this.uuid=$s(),this.name="",this.source=new Vv(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ye(0,0),this.repeat=new ye(1,1),this.center=new ye(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Be,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=f,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const n=e===void 0||typeof e=="string";if(!n&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Pv)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Cd:e.x=e.x-Math.floor(e.x);break;case Cr:e.x=e.x<0?0:1;break;case Rd:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Cd:e.y=e.y-Math.floor(e.y);break;case Cr:e.y=e.y<0?0:1;break;case Rd:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}cn.DEFAULT_IMAGE=null;cn.DEFAULT_MAPPING=Pv;cn.DEFAULT_ANISOTROPY=1;class It{constructor(e=0,n=0,i=0,r=1){It.prototype.isVector4=!0,this.x=e,this.y=n,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,n,i,r){return this.x=e,this.y=n,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this.w=e.w+n.w,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this.w+=e.w*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this.w=e.w-n.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const n=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*n+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*n+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*n+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*n+o[7]*i+o[11]*r+o[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const n=Math.sqrt(1-e.w*e.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/n,this.y=e.y/n,this.z=e.z/n),this}setAxisAngleFromRotationMatrix(e){let n,i,r,s;const l=e.elements,c=l[0],f=l[4],d=l[8],h=l[1],p=l[5],g=l[9],x=l[2],m=l[6],u=l[10];if(Math.abs(f-h)<.01&&Math.abs(d-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(f+h)<.1&&Math.abs(d+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+u-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;const _=(c+1)/2,M=(p+1)/2,b=(u+1)/2,C=(f+h)/4,A=(d+x)/4,L=(g+m)/4;return _>M&&_>b?_<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(_),r=C/i,s=A/i):M>b?M<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(M),i=C/r,s=L/r):b<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(b),i=A/s,r=L/s),this.set(i,r,s,n),this}let v=Math.sqrt((m-g)*(m-g)+(d-x)*(d-x)+(h-f)*(h-f));return Math.abs(v)<.001&&(v=1),this.x=(m-g)/v,this.y=(d-x)/v,this.z=(h-f)/v,this.w=Math.acos((c+p+u-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,n){return this.x=Math.max(e.x,Math.min(n.x,this.x)),this.y=Math.max(e.y,Math.min(n.y,this.y)),this.z=Math.max(e.z,Math.min(n.z,this.z)),this.w=Math.max(e.w,Math.min(n.w,this.w)),this}clampScalar(e,n){return this.x=Math.max(e,Math.min(n,this.x)),this.y=Math.max(e,Math.min(n,this.y)),this.z=Math.max(e,Math.min(n,this.z)),this.w=Math.max(e,Math.min(n,this.w)),this}clampLength(e,n){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this.w+=(e.w-this.w)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this.w=e.w+(n.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this.w=e.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class kM extends kr{constructor(e=1,n=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=n,this.depth=1,this.scissor=new It(0,0,e,n),this.scissorTest=!1,this.viewport=new It(0,0,e,n);const r={width:e,height:n,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:jn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new cn(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,n,i=1){if(this.width!==e||this.height!==n||this.depth!==i){this.width=e,this.height=n,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=n,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,e,n),this.scissor.set(0,0,e,n)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,r=e.textures.length;i<r;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const n=Object.assign({},e.texture.image);return this.texture.source=new Vv(n),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class $n extends kM{constructor(e=1,n=1,i={}){super(e,n,i),this.isWebGLRenderTarget=!0}}class Gv extends cn{constructor(e=null,n=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=Pn,this.minFilter=Pn,this.wrapR=Cr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class zM extends cn{constructor(e=null,n=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:r},this.magFilter=Pn,this.minFilter=Pn,this.wrapR=Cr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class nn{constructor(e=0,n=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=n,this._z=i,this._w=r}static slerpFlat(e,n,i,r,s,o,a){let l=i[r+0],c=i[r+1],f=i[r+2],d=i[r+3];const h=s[o+0],p=s[o+1],g=s[o+2],x=s[o+3];if(a===0){e[n+0]=l,e[n+1]=c,e[n+2]=f,e[n+3]=d;return}if(a===1){e[n+0]=h,e[n+1]=p,e[n+2]=g,e[n+3]=x;return}if(d!==x||l!==h||c!==p||f!==g){let m=1-a;const u=l*h+c*p+f*g+d*x,v=u>=0?1:-1,_=1-u*u;if(_>Number.EPSILON){const b=Math.sqrt(_),C=Math.atan2(b,u*v);m=Math.sin(m*C)/b,a=Math.sin(a*C)/b}const M=a*v;if(l=l*m+h*M,c=c*m+p*M,f=f*m+g*M,d=d*m+x*M,m===1-a){const b=1/Math.sqrt(l*l+c*c+f*f+d*d);l*=b,c*=b,f*=b,d*=b}}e[n]=l,e[n+1]=c,e[n+2]=f,e[n+3]=d}static multiplyQuaternionsFlat(e,n,i,r,s,o){const a=i[r],l=i[r+1],c=i[r+2],f=i[r+3],d=s[o],h=s[o+1],p=s[o+2],g=s[o+3];return e[n]=a*g+f*d+l*p-c*h,e[n+1]=l*g+f*h+c*d-a*p,e[n+2]=c*g+f*p+a*h-l*d,e[n+3]=f*g-a*d-l*h-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,n,i,r){return this._x=e,this._y=n,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,n=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),f=a(r/2),d=a(s/2),h=l(i/2),p=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=h*f*d+c*p*g,this._y=c*p*d-h*f*g,this._z=c*f*g+h*p*d,this._w=c*f*d-h*p*g;break;case"YXZ":this._x=h*f*d+c*p*g,this._y=c*p*d-h*f*g,this._z=c*f*g-h*p*d,this._w=c*f*d+h*p*g;break;case"ZXY":this._x=h*f*d-c*p*g,this._y=c*p*d+h*f*g,this._z=c*f*g+h*p*d,this._w=c*f*d-h*p*g;break;case"ZYX":this._x=h*f*d-c*p*g,this._y=c*p*d+h*f*g,this._z=c*f*g-h*p*d,this._w=c*f*d+h*p*g;break;case"YZX":this._x=h*f*d+c*p*g,this._y=c*p*d+h*f*g,this._z=c*f*g-h*p*d,this._w=c*f*d-h*p*g;break;case"XZY":this._x=h*f*d-c*p*g,this._y=c*p*d-h*f*g,this._z=c*f*g+h*p*d,this._w=c*f*d+h*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return n===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,n){const i=n/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const n=e.elements,i=n[0],r=n[4],s=n[8],o=n[1],a=n[5],l=n[9],c=n[2],f=n[6],d=n[10],h=i+a+d;if(h>0){const p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(f-l)*p,this._y=(s-c)*p,this._z=(o-r)*p}else if(i>a&&i>d){const p=2*Math.sqrt(1+i-a-d);this._w=(f-l)/p,this._x=.25*p,this._y=(r+o)/p,this._z=(s+c)/p}else if(a>d){const p=2*Math.sqrt(1+a-i-d);this._w=(s-c)/p,this._x=(r+o)/p,this._y=.25*p,this._z=(l+f)/p}else{const p=2*Math.sqrt(1+d-i-a);this._w=(o-r)/p,this._x=(s+c)/p,this._y=(l+f)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,n){let i=e.dot(n)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*n.z-e.z*n.y,this._y=e.z*n.x-e.x*n.z,this._z=e.x*n.y-e.y*n.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Xt(this.dot(e),-1,1)))}rotateTowards(e,n){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,n/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,n){const i=e._x,r=e._y,s=e._z,o=e._w,a=n._x,l=n._y,c=n._z,f=n._w;return this._x=i*f+o*a+r*c-s*l,this._y=r*f+o*l+s*a-i*c,this._z=s*f+o*c+i*l-r*a,this._w=o*f-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,n){if(n===0)return this;if(n===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const p=1-n;return this._w=p*o+n*this._w,this._x=p*i+n*this._x,this._y=p*r+n*this._y,this._z=p*s+n*this._z,this.normalize(),this}const c=Math.sqrt(l),f=Math.atan2(c,a),d=Math.sin((1-n)*f)/c,h=Math.sin(n*f)/c;return this._w=o*d+this._w*h,this._x=i*d+this._x*h,this._y=r*d+this._y*h,this._z=s*d+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,n,i){return this.copy(e).slerp(n,i)}random(){const e=2*Math.PI*Math.random(),n=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(n),s*Math.cos(n))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,n=0){return this._x=e[n],this._y=e[n+1],this._z=e[n+2],this._w=e[n+3],this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._w,e}fromBufferAttribute(e,n){return this._x=e.getX(n),this._y=e.getY(n),this._z=e.getZ(n),this._w=e.getW(n),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class F{constructor(e=0,n=0,i=0){F.prototype.isVector3=!0,this.x=e,this.y=n,this.z=i}set(e,n,i){return i===void 0&&(i=this.z),this.x=e,this.y=n,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this.z=e.z+n.z,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this.z+=e.z*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,n){return this.x=e.x*n.x,this.y=e.y*n.y,this.z=e.z*n.z,this}applyEuler(e){return this.applyQuaternion(Hp.setFromEuler(e))}applyAxisAngle(e,n){return this.applyQuaternion(Hp.setFromAxisAngle(e,n))}applyMatrix3(e){const n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[3]*i+s[6]*r,this.y=s[1]*n+s[4]*i+s[7]*r,this.z=s[2]*n+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const n=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*n+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*n+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*n+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const n=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*i),f=2*(a*n-s*r),d=2*(s*i-o*n);return this.x=n+l*c+o*d-a*f,this.y=i+l*f+a*c-s*d,this.z=r+l*d+s*f-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const n=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*n+s[4]*i+s[8]*r,this.y=s[1]*n+s[5]*i+s[9]*r,this.z=s[2]*n+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,n){return this.x=Math.max(e.x,Math.min(n.x,this.x)),this.y=Math.max(e.y,Math.min(n.y,this.y)),this.z=Math.max(e.z,Math.min(n.z,this.z)),this}clampScalar(e,n){return this.x=Math.max(e,Math.min(n,this.x)),this.y=Math.max(e,Math.min(n,this.y)),this.z=Math.max(e,Math.min(n,this.z)),this}clampLength(e,n){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this}lerpVectors(e,n,i){return this.x=e.x+(n.x-e.x)*i,this.y=e.y+(n.y-e.y)*i,this.z=e.z+(n.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,n){const i=e.x,r=e.y,s=e.z,o=n.x,a=n.y,l=n.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(e){const n=e.lengthSq();if(n===0)return this.set(0,0,0);const i=e.dot(this)/n;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return tu.copy(this).projectOnVector(e),this.sub(tu)}reflect(e){return this.sub(tu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;const i=this.dot(e)/n;return Math.acos(Xt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return n*n+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,n,i){const r=Math.sin(n)*e;return this.x=r*Math.sin(i),this.y=Math.cos(n)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,n,i){return this.x=e*Math.sin(n),this.y=i,this.z=e*Math.cos(n),this}setFromMatrixPosition(e){const n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(e){const n=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=n,this.y=i,this.z=r,this}setFromMatrixColumn(e,n){return this.fromArray(e.elements,n*4)}setFromMatrix3Column(e,n){return this.fromArray(e.elements,n*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this.z=e.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,n=Math.random()*2-1,i=Math.sqrt(1-n*n);return this.x=i*Math.cos(e),this.y=n,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const tu=new F,Hp=new nn;class Mi{constructor(e=new F(1/0,1/0,1/0),n=new F(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=n}set(e,n){return this.min.copy(e),this.max.copy(n),this}setFromArray(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n+=3)this.expandByPoint(Fn.fromArray(e,n));return this}setFromBufferAttribute(e){this.makeEmpty();for(let n=0,i=e.count;n<i;n++)this.expandByPoint(Fn.fromBufferAttribute(e,n));return this}setFromPoints(e){this.makeEmpty();for(let n=0,i=e.length;n<i;n++)this.expandByPoint(e[n]);return this}setFromCenterAndSize(e,n){const i=Fn.copy(n).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,n=!1){return this.makeEmpty(),this.expandByObject(e,n)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,n=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(n===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Fn):Fn.fromBufferAttribute(s,o),Fn.applyMatrix4(e.matrixWorld),this.expandByPoint(Fn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ra.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ra.copy(i.boundingBox)),Ra.applyMatrix4(e.matrixWorld),this.union(Ra)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],n);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,n){return n.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Fn),Fn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let n,i;return e.normal.x>0?(n=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(n=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(n+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(n+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(n+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(n+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),n<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(co),ba.subVectors(this.max,co),Wr.subVectors(e.a,co),Xr.subVectors(e.b,co),$r.subVectors(e.c,co),Ni.subVectors(Xr,Wr),Di.subVectors($r,Xr),hr.subVectors(Wr,$r);let n=[0,-Ni.z,Ni.y,0,-Di.z,Di.y,0,-hr.z,hr.y,Ni.z,0,-Ni.x,Di.z,0,-Di.x,hr.z,0,-hr.x,-Ni.y,Ni.x,0,-Di.y,Di.x,0,-hr.y,hr.x,0];return!nu(n,Wr,Xr,$r,ba)||(n=[1,0,0,0,1,0,0,0,1],!nu(n,Wr,Xr,$r,ba))?!1:(Pa.crossVectors(Ni,Di),n=[Pa.x,Pa.y,Pa.z],nu(n,Wr,Xr,$r,ba))}clampPoint(e,n){return n.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Fn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Fn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(li[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),li[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),li[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),li[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),li[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),li[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),li[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),li[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(li),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const li=[new F,new F,new F,new F,new F,new F,new F,new F],Fn=new F,Ra=new Mi,Wr=new F,Xr=new F,$r=new F,Ni=new F,Di=new F,hr=new F,co=new F,ba=new F,Pa=new F,pr=new F;function nu(t,e,n,i,r){for(let s=0,o=t.length-3;s<=o;s+=3){pr.fromArray(t,s);const a=r.x*Math.abs(pr.x)+r.y*Math.abs(pr.y)+r.z*Math.abs(pr.z),l=e.dot(pr),c=n.dot(pr),f=i.dot(pr);if(Math.max(-Math.max(l,c,f),Math.min(l,c,f))>a)return!1}return!0}const BM=new Mi,uo=new F,iu=new F;class dc{constructor(e=new F,n=-1){this.isSphere=!0,this.center=e,this.radius=n}set(e,n){return this.center.copy(e),this.radius=n,this}setFromPoints(e,n){const i=this.center;n!==void 0?i.copy(n):BM.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const n=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=n*n}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,n){const i=this.center.distanceToSquared(e);return n.copy(e),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;uo.subVectors(e,this.center);const n=uo.lengthSq();if(n>this.radius*this.radius){const i=Math.sqrt(n),r=(i-this.radius)*.5;this.center.addScaledVector(uo,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(iu.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(uo.copy(e.center).add(iu)),this.expandByPoint(uo.copy(e.center).sub(iu))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const ci=new F,ru=new F,La=new F,Ii=new F,su=new F,Na=new F,ou=new F;class fc{constructor(e=new F,n=new F(0,0,-1)){this.origin=e,this.direction=n}set(e,n){return this.origin.copy(e),this.direction.copy(n),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,n){return n.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ci)),this}closestPointToPoint(e,n){n.subVectors(e,this.origin);const i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const n=ci.subVectors(e,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(e):(ci.copy(this.origin).addScaledVector(this.direction,n),ci.distanceToSquared(e))}distanceSqToSegment(e,n,i,r){ru.copy(e).add(n).multiplyScalar(.5),La.copy(n).sub(e).normalize(),Ii.copy(this.origin).sub(ru);const s=e.distanceTo(n)*.5,o=-this.direction.dot(La),a=Ii.dot(this.direction),l=-Ii.dot(La),c=Ii.lengthSq(),f=Math.abs(1-o*o);let d,h,p,g;if(f>0)if(d=o*l-a,h=o*a-l,g=s*f,d>=0)if(h>=-g)if(h<=g){const x=1/f;d*=x,h*=x,p=d*(d+o*h+2*a)+h*(o*d+h+2*l)+c}else h=s,d=Math.max(0,-(o*h+a)),p=-d*d+h*(h+2*l)+c;else h=-s,d=Math.max(0,-(o*h+a)),p=-d*d+h*(h+2*l)+c;else h<=-g?(d=Math.max(0,-(-o*s+a)),h=d>0?-s:Math.min(Math.max(-s,-l),s),p=-d*d+h*(h+2*l)+c):h<=g?(d=0,h=Math.min(Math.max(-s,-l),s),p=h*(h+2*l)+c):(d=Math.max(0,-(o*s+a)),h=d>0?s:Math.min(Math.max(-s,-l),s),p=-d*d+h*(h+2*l)+c);else h=o>0?-s:s,d=Math.max(0,-(o*h+a)),p=-d*d+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(ru).addScaledVector(La,h),p}intersectSphere(e,n){ci.subVectors(e.center,this.origin);const i=ci.dot(this.direction),r=ci.dot(ci)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,n):this.at(a,n)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const n=e.normal.dot(this.direction);if(n===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/n;return i>=0?i:null}intersectPlane(e,n){const i=this.distanceToPlane(e);return i===null?null:this.at(i,n)}intersectsPlane(e){const n=e.distanceToPoint(this.origin);return n===0||e.normal.dot(this.direction)*n<0}intersectBox(e,n){let i,r,s,o,a,l;const c=1/this.direction.x,f=1/this.direction.y,d=1/this.direction.z,h=this.origin;return c>=0?(i=(e.min.x-h.x)*c,r=(e.max.x-h.x)*c):(i=(e.max.x-h.x)*c,r=(e.min.x-h.x)*c),f>=0?(s=(e.min.y-h.y)*f,o=(e.max.y-h.y)*f):(s=(e.max.y-h.y)*f,o=(e.min.y-h.y)*f),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),d>=0?(a=(e.min.z-h.z)*d,l=(e.max.z-h.z)*d):(a=(e.max.z-h.z)*d,l=(e.min.z-h.z)*d),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,n)}intersectsBox(e){return this.intersectBox(e,ci)!==null}intersectTriangle(e,n,i,r,s){su.subVectors(n,e),Na.subVectors(i,e),ou.crossVectors(su,Na);let o=this.direction.dot(ou),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Ii.subVectors(this.origin,e);const l=a*this.direction.dot(Na.crossVectors(Ii,Na));if(l<0)return null;const c=a*this.direction.dot(su.cross(Ii));if(c<0||l+c>o)return null;const f=-a*Ii.dot(ou);return f<0?null:this.at(f/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ot{constructor(e,n,i,r,s,o,a,l,c,f,d,h,p,g,x,m){ot.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,n,i,r,s,o,a,l,c,f,d,h,p,g,x,m)}set(e,n,i,r,s,o,a,l,c,f,d,h,p,g,x,m){const u=this.elements;return u[0]=e,u[4]=n,u[8]=i,u[12]=r,u[1]=s,u[5]=o,u[9]=a,u[13]=l,u[2]=c,u[6]=f,u[10]=d,u[14]=h,u[3]=p,u[7]=g,u[11]=x,u[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ot().fromArray(this.elements)}copy(e){const n=this.elements,i=e.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(e){const n=this.elements,i=e.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(e){const n=e.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(e,n,i){return e.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,n,i){return this.set(e.x,n.x,i.x,0,e.y,n.y,i.y,0,e.z,n.z,i.z,0,0,0,0,1),this}extractRotation(e){const n=this.elements,i=e.elements,r=1/Yr.setFromMatrixColumn(e,0).length(),s=1/Yr.setFromMatrixColumn(e,1).length(),o=1/Yr.setFromMatrixColumn(e,2).length();return n[0]=i[0]*r,n[1]=i[1]*r,n[2]=i[2]*r,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*o,n[9]=i[9]*o,n[10]=i[10]*o,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(e){const n=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),f=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const h=o*f,p=o*d,g=a*f,x=a*d;n[0]=l*f,n[4]=-l*d,n[8]=c,n[1]=p+g*c,n[5]=h-x*c,n[9]=-a*l,n[2]=x-h*c,n[6]=g+p*c,n[10]=o*l}else if(e.order==="YXZ"){const h=l*f,p=l*d,g=c*f,x=c*d;n[0]=h+x*a,n[4]=g*a-p,n[8]=o*c,n[1]=o*d,n[5]=o*f,n[9]=-a,n[2]=p*a-g,n[6]=x+h*a,n[10]=o*l}else if(e.order==="ZXY"){const h=l*f,p=l*d,g=c*f,x=c*d;n[0]=h-x*a,n[4]=-o*d,n[8]=g+p*a,n[1]=p+g*a,n[5]=o*f,n[9]=x-h*a,n[2]=-o*c,n[6]=a,n[10]=o*l}else if(e.order==="ZYX"){const h=o*f,p=o*d,g=a*f,x=a*d;n[0]=l*f,n[4]=g*c-p,n[8]=h*c+x,n[1]=l*d,n[5]=x*c+h,n[9]=p*c-g,n[2]=-c,n[6]=a*l,n[10]=o*l}else if(e.order==="YZX"){const h=o*l,p=o*c,g=a*l,x=a*c;n[0]=l*f,n[4]=x-h*d,n[8]=g*d+p,n[1]=d,n[5]=o*f,n[9]=-a*f,n[2]=-c*f,n[6]=p*d+g,n[10]=h-x*d}else if(e.order==="XZY"){const h=o*l,p=o*c,g=a*l,x=a*c;n[0]=l*f,n[4]=-d,n[8]=c*f,n[1]=h*d+x,n[5]=o*f,n[9]=p*d-g,n[2]=g*d-p,n[6]=a*f,n[10]=x*d+h}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(e){return this.compose(HM,e,VM)}lookAt(e,n,i){const r=this.elements;return dn.subVectors(e,n),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),Ui.crossVectors(i,dn),Ui.lengthSq()===0&&(Math.abs(i.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),Ui.crossVectors(i,dn)),Ui.normalize(),Da.crossVectors(dn,Ui),r[0]=Ui.x,r[4]=Da.x,r[8]=dn.x,r[1]=Ui.y,r[5]=Da.y,r[9]=dn.y,r[2]=Ui.z,r[6]=Da.z,r[10]=dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const i=e.elements,r=n.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],f=i[1],d=i[5],h=i[9],p=i[13],g=i[2],x=i[6],m=i[10],u=i[14],v=i[3],_=i[7],M=i[11],b=i[15],C=r[0],A=r[4],L=r[8],T=r[12],S=r[1],U=r[5],k=r[9],D=r[13],V=r[2],z=r[6],O=r[10],Z=r[14],I=r[3],G=r[7],X=r[11],ee=r[15];return s[0]=o*C+a*S+l*V+c*I,s[4]=o*A+a*U+l*z+c*G,s[8]=o*L+a*k+l*O+c*X,s[12]=o*T+a*D+l*Z+c*ee,s[1]=f*C+d*S+h*V+p*I,s[5]=f*A+d*U+h*z+p*G,s[9]=f*L+d*k+h*O+p*X,s[13]=f*T+d*D+h*Z+p*ee,s[2]=g*C+x*S+m*V+u*I,s[6]=g*A+x*U+m*z+u*G,s[10]=g*L+x*k+m*O+u*X,s[14]=g*T+x*D+m*Z+u*ee,s[3]=v*C+_*S+M*V+b*I,s[7]=v*A+_*U+M*z+b*G,s[11]=v*L+_*k+M*O+b*X,s[15]=v*T+_*D+M*Z+b*ee,this}multiplyScalar(e){const n=this.elements;return n[0]*=e,n[4]*=e,n[8]*=e,n[12]*=e,n[1]*=e,n[5]*=e,n[9]*=e,n[13]*=e,n[2]*=e,n[6]*=e,n[10]*=e,n[14]*=e,n[3]*=e,n[7]*=e,n[11]*=e,n[15]*=e,this}determinant(){const e=this.elements,n=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],f=e[2],d=e[6],h=e[10],p=e[14],g=e[3],x=e[7],m=e[11],u=e[15];return g*(+s*l*d-r*c*d-s*a*h+i*c*h+r*a*p-i*l*p)+x*(+n*l*p-n*c*h+s*o*h-r*o*p+r*c*f-s*l*f)+m*(+n*c*d-n*a*p-s*o*d+i*o*p+s*a*f-i*c*f)+u*(-r*a*f-n*l*d+n*a*h+r*o*d-i*o*h+i*l*f)}transpose(){const e=this.elements;let n;return n=e[1],e[1]=e[4],e[4]=n,n=e[2],e[2]=e[8],e[8]=n,n=e[6],e[6]=e[9],e[9]=n,n=e[3],e[3]=e[12],e[12]=n,n=e[7],e[7]=e[13],e[13]=n,n=e[11],e[11]=e[14],e[14]=n,this}setPosition(e,n,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=n,r[14]=i),this}invert(){const e=this.elements,n=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],f=e[8],d=e[9],h=e[10],p=e[11],g=e[12],x=e[13],m=e[14],u=e[15],v=d*m*c-x*h*c+x*l*p-a*m*p-d*l*u+a*h*u,_=g*h*c-f*m*c-g*l*p+o*m*p+f*l*u-o*h*u,M=f*x*c-g*d*c+g*a*p-o*x*p-f*a*u+o*d*u,b=g*d*l-f*x*l-g*a*h+o*x*h+f*a*m-o*d*m,C=n*v+i*_+r*M+s*b;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/C;return e[0]=v*A,e[1]=(x*h*s-d*m*s-x*r*p+i*m*p+d*r*u-i*h*u)*A,e[2]=(a*m*s-x*l*s+x*r*c-i*m*c-a*r*u+i*l*u)*A,e[3]=(d*l*s-a*h*s-d*r*c+i*h*c+a*r*p-i*l*p)*A,e[4]=_*A,e[5]=(f*m*s-g*h*s+g*r*p-n*m*p-f*r*u+n*h*u)*A,e[6]=(g*l*s-o*m*s-g*r*c+n*m*c+o*r*u-n*l*u)*A,e[7]=(o*h*s-f*l*s+f*r*c-n*h*c-o*r*p+n*l*p)*A,e[8]=M*A,e[9]=(g*d*s-f*x*s-g*i*p+n*x*p+f*i*u-n*d*u)*A,e[10]=(o*x*s-g*a*s+g*i*c-n*x*c-o*i*u+n*a*u)*A,e[11]=(f*a*s-o*d*s-f*i*c+n*d*c+o*i*p-n*a*p)*A,e[12]=b*A,e[13]=(f*x*r-g*d*r+g*i*h-n*x*h-f*i*m+n*d*m)*A,e[14]=(g*a*r-o*x*r-g*i*l+n*x*l+o*i*m-n*a*m)*A,e[15]=(o*d*r-f*a*r+f*i*l-n*d*l-o*i*h+n*a*h)*A,this}scale(e){const n=this.elements,i=e.x,r=e.y,s=e.z;return n[0]*=i,n[4]*=r,n[8]*=s,n[1]*=i,n[5]*=r,n[9]*=s,n[2]*=i,n[6]*=r,n[10]*=s,n[3]*=i,n[7]*=r,n[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,n=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(n,i,r))}makeTranslation(e,n,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(e){const n=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(e){const n=Math.cos(e),i=Math.sin(e);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(e){const n=Math.cos(e),i=Math.sin(e);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,n){const i=Math.cos(n),r=Math.sin(n),s=1-i,o=e.x,a=e.y,l=e.z,c=s*o,f=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,f*a+i,f*l-r*o,0,c*l-r*a,f*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(e,n,i){return this.set(e,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,n,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,n,r,1,0,0,0,0,1),this}compose(e,n,i){const r=this.elements,s=n._x,o=n._y,a=n._z,l=n._w,c=s+s,f=o+o,d=a+a,h=s*c,p=s*f,g=s*d,x=o*f,m=o*d,u=a*d,v=l*c,_=l*f,M=l*d,b=i.x,C=i.y,A=i.z;return r[0]=(1-(x+u))*b,r[1]=(p+M)*b,r[2]=(g-_)*b,r[3]=0,r[4]=(p-M)*C,r[5]=(1-(h+u))*C,r[6]=(m+v)*C,r[7]=0,r[8]=(g+_)*A,r[9]=(m-v)*A,r[10]=(1-(h+x))*A,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,n,i){const r=this.elements;let s=Yr.set(r[0],r[1],r[2]).length();const o=Yr.set(r[4],r[5],r[6]).length(),a=Yr.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],On.copy(this);const c=1/s,f=1/o,d=1/a;return On.elements[0]*=c,On.elements[1]*=c,On.elements[2]*=c,On.elements[4]*=f,On.elements[5]*=f,On.elements[6]*=f,On.elements[8]*=d,On.elements[9]*=d,On.elements[10]*=d,n.setFromRotationMatrix(On),i.x=s,i.y=o,i.z=a,this}makePerspective(e,n,i,r,s,o,a=xi){const l=this.elements,c=2*s/(n-e),f=2*s/(i-r),d=(n+e)/(n-e),h=(i+r)/(i-r);let p,g;if(a===xi)p=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===Hl)p=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=f,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,n,i,r,s,o,a=xi){const l=this.elements,c=1/(n-e),f=1/(i-r),d=1/(o-s),h=(n+e)*c,p=(i+r)*f;let g,x;if(a===xi)g=(o+s)*d,x=-2*d;else if(a===Hl)g=s*d,x=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-h,l[1]=0,l[5]=2*f,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=x,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const n=this.elements,i=e.elements;for(let r=0;r<16;r++)if(n[r]!==i[r])return!1;return!0}fromArray(e,n=0){for(let i=0;i<16;i++)this.elements[i]=e[i+n];return this}toArray(e=[],n=0){const i=this.elements;return e[n]=i[0],e[n+1]=i[1],e[n+2]=i[2],e[n+3]=i[3],e[n+4]=i[4],e[n+5]=i[5],e[n+6]=i[6],e[n+7]=i[7],e[n+8]=i[8],e[n+9]=i[9],e[n+10]=i[10],e[n+11]=i[11],e[n+12]=i[12],e[n+13]=i[13],e[n+14]=i[14],e[n+15]=i[15],e}}const Yr=new F,On=new ot,HM=new F(0,0,0),VM=new F(1,1,1),Ui=new F,Da=new F,dn=new F,Vp=new ot,Gp=new nn;class si{constructor(e=0,n=0,i=0,r=si.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=n,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,n,i,r=this._order){return this._x=e,this._y=n,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,n=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],f=r[9],d=r[2],h=r[6],p=r[10];switch(n){case"XYZ":this._y=Math.asin(Xt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-f,p),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Xt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(Xt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Xt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Xt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-f,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Xt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-f,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,n,i){return Vp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Vp,n,i)}setFromVector3(e,n=this._order){return this.set(e.x,e.y,e.z,n)}reorder(e){return Gp.setFromEuler(this),this.setFromQuaternion(Gp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],n=0){return e[n]=this._x,e[n+1]=this._y,e[n+2]=this._z,e[n+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}si.DEFAULT_ORDER="XYZ";class Nf{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let GM=0;const jp=new F,qr=new nn,ui=new ot,Ia=new F,fo=new F,jM=new F,WM=new nn,Wp=new F(1,0,0),Xp=new F(0,1,0),$p=new F(0,0,1),Yp={type:"added"},XM={type:"removed"},Kr={type:"childadded",child:null},au={type:"childremoved",child:null};class At extends kr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:GM++}),this.uuid=$s(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=At.DEFAULT_UP.clone();const e=new F,n=new si,i=new nn,r=new F(1,1,1);function s(){i.setFromEuler(n,!1)}function o(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ot},normalMatrix:{value:new Be}}),this.matrix=new ot,this.matrixWorld=new ot,this.matrixAutoUpdate=At.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Nf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,n){this.quaternion.setFromAxisAngle(e,n)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,n){return qr.setFromAxisAngle(e,n),this.quaternion.multiply(qr),this}rotateOnWorldAxis(e,n){return qr.setFromAxisAngle(e,n),this.quaternion.premultiply(qr),this}rotateX(e){return this.rotateOnAxis(Wp,e)}rotateY(e){return this.rotateOnAxis(Xp,e)}rotateZ(e){return this.rotateOnAxis($p,e)}translateOnAxis(e,n){return jp.copy(e).applyQuaternion(this.quaternion),this.position.add(jp.multiplyScalar(n)),this}translateX(e){return this.translateOnAxis(Wp,e)}translateY(e){return this.translateOnAxis(Xp,e)}translateZ(e){return this.translateOnAxis($p,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ui.copy(this.matrixWorld).invert())}lookAt(e,n,i){e.isVector3?Ia.copy(e):Ia.set(e,n,i);const r=this.parent;this.updateWorldMatrix(!0,!1),fo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ui.lookAt(fo,Ia,this.up):ui.lookAt(Ia,fo,this.up),this.quaternion.setFromRotationMatrix(ui),r&&(ui.extractRotation(r.matrixWorld),qr.setFromRotationMatrix(ui),this.quaternion.premultiply(qr.invert()))}add(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Yp),Kr.child=e,this.dispatchEvent(Kr),Kr.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const n=this.children.indexOf(e);return n!==-1&&(e.parent=null,this.children.splice(n,1),e.dispatchEvent(XM),au.child=e,this.dispatchEvent(au),au.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ui.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ui.multiply(e.parent.matrixWorld)),e.applyMatrix4(ui),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Yp),Kr.child=e,this.dispatchEvent(Kr),Kr.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,n){if(this[e]===n)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,n);if(o!==void 0)return o}}getObjectsByProperty(e,n,i=[]){this[e]===n&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,n,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fo,e,jM),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fo,WM,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return e.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(e){e(this);const n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const n=this.children;for(let i=0,r=n.length;i<r;i++)n[i].traverseVisible(e)}traverseAncestors(e){const n=this.parent;n!==null&&(e(n),n.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const n=this.children;for(let i=0,r=n.length;i<r;i++){const s=n[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,n){const i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),n===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++){const a=r[s];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){const n=e===void 0||typeof e=="string",i={};n&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,f=l.length;c<f;c++){const d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(n){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),f=o(e.images),d=o(e.shapes),h=o(e.skeletons),p=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),f.length>0&&(i.images=f),d.length>0&&(i.shapes=d),h.length>0&&(i.skeletons=h),p.length>0&&(i.animations=p),g.length>0&&(i.nodes=g)}return i.object=r,i;function o(a){const l=[];for(const c in a){const f=a[c];delete f.metadata,l.push(f)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,n=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),n===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}At.DEFAULT_UP=new F(0,1,0);At.DEFAULT_MATRIX_AUTO_UPDATE=!0;At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const kn=new F,di=new F,lu=new F,fi=new F,Zr=new F,Qr=new F,qp=new F,cu=new F,uu=new F,du=new F;class ei{constructor(e=new F,n=new F,i=new F){this.a=e,this.b=n,this.c=i}static getNormal(e,n,i,r){r.subVectors(i,n),kn.subVectors(e,n),r.cross(kn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,n,i,r,s){kn.subVectors(r,n),di.subVectors(i,n),lu.subVectors(e,n);const o=kn.dot(kn),a=kn.dot(di),l=kn.dot(lu),c=di.dot(di),f=di.dot(lu),d=o*c-a*a;if(d===0)return s.set(0,0,0),null;const h=1/d,p=(c*l-a*f)*h,g=(o*f-a*l)*h;return s.set(1-p-g,g,p)}static containsPoint(e,n,i,r){return this.getBarycoord(e,n,i,r,fi)===null?!1:fi.x>=0&&fi.y>=0&&fi.x+fi.y<=1}static getInterpolation(e,n,i,r,s,o,a,l){return this.getBarycoord(e,n,i,r,fi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,fi.x),l.addScaledVector(o,fi.y),l.addScaledVector(a,fi.z),l)}static isFrontFacing(e,n,i,r){return kn.subVectors(i,n),di.subVectors(e,n),kn.cross(di).dot(r)<0}set(e,n,i){return this.a.copy(e),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(e,n,i,r){return this.a.copy(e[n]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,n,i,r){return this.a.fromBufferAttribute(e,n),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return kn.subVectors(this.c,this.b),di.subVectors(this.a,this.b),kn.cross(di).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return ei.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,n){return ei.getBarycoord(e,this.a,this.b,this.c,n)}getInterpolation(e,n,i,r,s){return ei.getInterpolation(e,this.a,this.b,this.c,n,i,r,s)}containsPoint(e){return ei.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return ei.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,n){const i=this.a,r=this.b,s=this.c;let o,a;Zr.subVectors(r,i),Qr.subVectors(s,i),cu.subVectors(e,i);const l=Zr.dot(cu),c=Qr.dot(cu);if(l<=0&&c<=0)return n.copy(i);uu.subVectors(e,r);const f=Zr.dot(uu),d=Qr.dot(uu);if(f>=0&&d<=f)return n.copy(r);const h=l*d-f*c;if(h<=0&&l>=0&&f<=0)return o=l/(l-f),n.copy(i).addScaledVector(Zr,o);du.subVectors(e,s);const p=Zr.dot(du),g=Qr.dot(du);if(g>=0&&p<=g)return n.copy(s);const x=p*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),n.copy(i).addScaledVector(Qr,a);const m=f*g-p*d;if(m<=0&&d-f>=0&&p-g>=0)return qp.subVectors(s,r),a=(d-f)/(d-f+(p-g)),n.copy(r).addScaledVector(qp,a);const u=1/(m+x+h);return o=x*u,a=h*u,n.copy(i).addScaledVector(Zr,o).addScaledVector(Qr,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const jv={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Fi={h:0,s:0,l:0},Ua={h:0,s:0,l:0};function fu(t,e,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?t+(e-t)*6*n:n<1/2?e:n<2/3?t+(e-t)*6*(2/3-n):t}class Ge{constructor(e,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,n,i)}set(e,n,i){if(n===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,n,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,n=Vn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.toWorkingColorSpace(this,n),this}setRGB(e,n,i,r=tt.workingColorSpace){return this.r=e,this.g=n,this.b=i,tt.toWorkingColorSpace(this,r),this}setHSL(e,n,i,r=tt.workingColorSpace){if(e=Lf(e,1),n=Xt(n,0,1),i=Xt(i,0,1),n===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+n):i+n-i*n,o=2*i-s;this.r=fu(o,s,e+1/3),this.g=fu(o,s,e),this.b=fu(o,s,e-1/3)}return tt.toWorkingColorSpace(this,r),this}setStyle(e,n=Vn){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(o===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,n);return this}setColorName(e,n=Vn){const i=jv[e.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ps(e.r),this.g=Ps(e.g),this.b=Ps(e.b),this}copyLinearToSRGB(e){return this.r=Jc(e.r),this.g=Jc(e.g),this.b=Jc(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Vn){return tt.fromWorkingColorSpace(jt.copy(this),e),Math.round(Xt(jt.r*255,0,255))*65536+Math.round(Xt(jt.g*255,0,255))*256+Math.round(Xt(jt.b*255,0,255))}getHexString(e=Vn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,n=tt.workingColorSpace){tt.fromWorkingColorSpace(jt.copy(this),n);const i=jt.r,r=jt.g,s=jt.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let l,c;const f=(a+o)/2;if(a===o)l=0,c=0;else{const d=o-a;switch(c=f<=.5?d/(o+a):d/(2-o-a),o){case i:l=(r-s)/d+(r<s?6:0);break;case r:l=(s-i)/d+2;break;case s:l=(i-r)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=f,e}getRGB(e,n=tt.workingColorSpace){return tt.fromWorkingColorSpace(jt.copy(this),n),e.r=jt.r,e.g=jt.g,e.b=jt.b,e}getStyle(e=Vn){tt.fromWorkingColorSpace(jt.copy(this),e);const n=jt.r,i=jt.g,r=jt.b;return e!==Vn?`color(${e} ${n.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,n,i){return this.getHSL(Fi),this.setHSL(Fi.h+e,Fi.s+n,Fi.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,n){return this.r=e.r+n.r,this.g=e.g+n.g,this.b=e.b+n.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,n){return this.r+=(e.r-this.r)*n,this.g+=(e.g-this.g)*n,this.b+=(e.b-this.b)*n,this}lerpColors(e,n,i){return this.r=e.r+(n.r-e.r)*i,this.g=e.g+(n.g-e.g)*i,this.b=e.b+(n.b-e.b)*i,this}lerpHSL(e,n){this.getHSL(Fi),e.getHSL(Ua);const i=Io(Fi.h,Ua.h,n),r=Io(Fi.s,Ua.s,n),s=Io(Fi.l,Ua.l,n);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const n=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*n+s[3]*i+s[6]*r,this.g=s[1]*n+s[4]*i+s[7]*r,this.b=s[2]*n+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,n=0){return this.r=e[n],this.g=e[n+1],this.b=e[n+2],this}toArray(e=[],n=0){return e[n]=this.r,e[n+1]=this.g,e[n+2]=this.b,e}fromBufferAttribute(e,n){return this.r=e.getX(n),this.g=e.getY(n),this.b=e.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const jt=new Ge;Ge.NAMES=jv;let $M=0;class Ys extends kr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:$M++}),this.uuid=$s(),this.name="",this.type="Material",this.blending=Rs,this.side=or,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ed,this.blendDst=Td,this.blendEquation=Mr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ge(0,0,0),this.blendAlpha=0,this.depthFunc=Ol,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ip,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Gr,this.stencilZFail=Gr,this.stencilZPass=Gr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const n in e){const i=e[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}const r=this[n];if(r===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[n]=i}}toJSON(e){const n=e===void 0||typeof e=="string";n&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Rs&&(i.blending=this.blending),this.side!==or&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Ed&&(i.blendSrc=this.blendSrc),this.blendDst!==Td&&(i.blendDst=this.blendDst),this.blendEquation!==Mr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ol&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ip&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Gr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Gr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Gr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(n){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const n=e.clippingPlanes;let i=null;if(n!==null){const r=n.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class hc extends Ys{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ge(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new si,this.combine=Tv,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Mt=new F,Fa=new ye;class ri{constructor(e,n,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=n,this.count=e!==void 0?e.length/n:0,this.normalized=i,this.usage=Up,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=$i,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return DM("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,n){this.updateRanges.push({start:e,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,n,i){e*=this.itemSize,i*=n.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=n.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)Fa.fromBufferAttribute(this,n),Fa.applyMatrix3(e),this.setXY(n,Fa.x,Fa.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)Mt.fromBufferAttribute(this,n),Mt.applyMatrix3(e),this.setXYZ(n,Mt.x,Mt.y,Mt.z);return this}applyMatrix4(e){for(let n=0,i=this.count;n<i;n++)Mt.fromBufferAttribute(this,n),Mt.applyMatrix4(e),this.setXYZ(n,Mt.x,Mt.y,Mt.z);return this}applyNormalMatrix(e){for(let n=0,i=this.count;n<i;n++)Mt.fromBufferAttribute(this,n),Mt.applyNormalMatrix(e),this.setXYZ(n,Mt.x,Mt.y,Mt.z);return this}transformDirection(e){for(let n=0,i=this.count;n<i;n++)Mt.fromBufferAttribute(this,n),Mt.transformDirection(e),this.setXYZ(n,Mt.x,Mt.y,Mt.z);return this}set(e,n=0){return this.array.set(e,n),this}getComponent(e,n){let i=this.array[e*this.itemSize+n];return this.normalized&&(i=ls(i,this.array)),i}setComponent(e,n,i){return this.normalized&&(i=Yt(i,this.array)),this.array[e*this.itemSize+n]=i,this}getX(e){let n=this.array[e*this.itemSize];return this.normalized&&(n=ls(n,this.array)),n}setX(e,n){return this.normalized&&(n=Yt(n,this.array)),this.array[e*this.itemSize]=n,this}getY(e){let n=this.array[e*this.itemSize+1];return this.normalized&&(n=ls(n,this.array)),n}setY(e,n){return this.normalized&&(n=Yt(n,this.array)),this.array[e*this.itemSize+1]=n,this}getZ(e){let n=this.array[e*this.itemSize+2];return this.normalized&&(n=ls(n,this.array)),n}setZ(e,n){return this.normalized&&(n=Yt(n,this.array)),this.array[e*this.itemSize+2]=n,this}getW(e){let n=this.array[e*this.itemSize+3];return this.normalized&&(n=ls(n,this.array)),n}setW(e,n){return this.normalized&&(n=Yt(n,this.array)),this.array[e*this.itemSize+3]=n,this}setXY(e,n,i){return e*=this.itemSize,this.normalized&&(n=Yt(n,this.array),i=Yt(i,this.array)),this.array[e+0]=n,this.array[e+1]=i,this}setXYZ(e,n,i,r){return e*=this.itemSize,this.normalized&&(n=Yt(n,this.array),i=Yt(i,this.array),r=Yt(r,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,n,i,r,s){return e*=this.itemSize,this.normalized&&(n=Yt(n,this.array),i=Yt(i,this.array),r=Yt(r,this.array),s=Yt(s,this.array)),this.array[e+0]=n,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Up&&(e.usage=this.usage),e}}class Wv extends ri{constructor(e,n,i){super(new Uint16Array(e),n,i)}}class Xv extends ri{constructor(e,n,i){super(new Uint32Array(e),n,i)}}class vt extends ri{constructor(e,n,i){super(new Float32Array(e),n,i)}}let YM=0;const Tn=new ot,hu=new At,Jr=new F,fn=new Mi,ho=new Mi,Pt=new F;class Sn extends kr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:YM++}),this.uuid=$s(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Hv(e)?Xv:Wv)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,n){return this.attributes[e]=n,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,n,i=0){this.groups.push({start:e,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,n){this.drawRange.start=e,this.drawRange.count=n}applyMatrix4(e){const n=this.attributes.position;n!==void 0&&(n.applyMatrix4(e),n.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Be().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Tn.makeRotationFromQuaternion(e),this.applyMatrix4(Tn),this}rotateX(e){return Tn.makeRotationX(e),this.applyMatrix4(Tn),this}rotateY(e){return Tn.makeRotationY(e),this.applyMatrix4(Tn),this}rotateZ(e){return Tn.makeRotationZ(e),this.applyMatrix4(Tn),this}translate(e,n,i){return Tn.makeTranslation(e,n,i),this.applyMatrix4(Tn),this}scale(e,n,i){return Tn.makeScale(e,n,i),this.applyMatrix4(Tn),this}lookAt(e){return hu.lookAt(e),hu.updateMatrix(),this.applyMatrix4(hu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Jr).negate(),this.translate(Jr.x,Jr.y,Jr.z),this}setFromPoints(e){const n=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];n.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new vt(n,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Mi);const e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new F(-1/0,-1/0,-1/0),new F(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),n)for(let i=0,r=n.length;i<r;i++){const s=n[i];fn.setFromBufferAttribute(s),this.morphTargetsRelative?(Pt.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(Pt),Pt.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(Pt)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new dc);const e=this.attributes.position,n=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new F,1/0);return}if(e){const i=this.boundingSphere.center;if(fn.setFromBufferAttribute(e),n)for(let s=0,o=n.length;s<o;s++){const a=n[s];ho.setFromBufferAttribute(a),this.morphTargetsRelative?(Pt.addVectors(fn.min,ho.min),fn.expandByPoint(Pt),Pt.addVectors(fn.max,ho.max),fn.expandByPoint(Pt)):(fn.expandByPoint(ho.min),fn.expandByPoint(ho.max))}fn.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)Pt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Pt));if(n)for(let s=0,o=n.length;s<o;s++){const a=n[s],l=this.morphTargetsRelative;for(let c=0,f=a.count;c<f;c++)Pt.fromBufferAttribute(a,c),l&&(Jr.fromBufferAttribute(e,c),Pt.add(Jr)),r=Math.max(r,i.distanceToSquared(Pt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,n=this.attributes;if(e===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=n.position,r=n.normal,s=n.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ri(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<i.count;L++)a[L]=new F,l[L]=new F;const c=new F,f=new F,d=new F,h=new ye,p=new ye,g=new ye,x=new F,m=new F;function u(L,T,S){c.fromBufferAttribute(i,L),f.fromBufferAttribute(i,T),d.fromBufferAttribute(i,S),h.fromBufferAttribute(s,L),p.fromBufferAttribute(s,T),g.fromBufferAttribute(s,S),f.sub(c),d.sub(c),p.sub(h),g.sub(h);const U=1/(p.x*g.y-g.x*p.y);isFinite(U)&&(x.copy(f).multiplyScalar(g.y).addScaledVector(d,-p.y).multiplyScalar(U),m.copy(d).multiplyScalar(p.x).addScaledVector(f,-g.x).multiplyScalar(U),a[L].add(x),a[T].add(x),a[S].add(x),l[L].add(m),l[T].add(m),l[S].add(m))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let L=0,T=v.length;L<T;++L){const S=v[L],U=S.start,k=S.count;for(let D=U,V=U+k;D<V;D+=3)u(e.getX(D+0),e.getX(D+1),e.getX(D+2))}const _=new F,M=new F,b=new F,C=new F;function A(L){b.fromBufferAttribute(r,L),C.copy(b);const T=a[L];_.copy(T),_.sub(b.multiplyScalar(b.dot(T))).normalize(),M.crossVectors(C,T);const U=M.dot(l[L])<0?-1:1;o.setXYZW(L,_.x,_.y,_.z,U)}for(let L=0,T=v.length;L<T;++L){const S=v[L],U=S.start,k=S.count;for(let D=U,V=U+k;D<V;D+=3)A(e.getX(D+0)),A(e.getX(D+1)),A(e.getX(D+2))}}computeVertexNormals(){const e=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new ri(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let h=0,p=i.count;h<p;h++)i.setXYZ(h,0,0,0);const r=new F,s=new F,o=new F,a=new F,l=new F,c=new F,f=new F,d=new F;if(e)for(let h=0,p=e.count;h<p;h+=3){const g=e.getX(h+0),x=e.getX(h+1),m=e.getX(h+2);r.fromBufferAttribute(n,g),s.fromBufferAttribute(n,x),o.fromBufferAttribute(n,m),f.subVectors(o,s),d.subVectors(r,s),f.cross(d),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,x),c.fromBufferAttribute(i,m),a.add(f),l.add(f),c.add(f),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(x,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,p=n.count;h<p;h+=3)r.fromBufferAttribute(n,h+0),s.fromBufferAttribute(n,h+1),o.fromBufferAttribute(n,h+2),f.subVectors(o,s),d.subVectors(r,s),f.cross(d),i.setXYZ(h+0,f.x,f.y,f.z),i.setXYZ(h+1,f.x,f.y,f.z),i.setXYZ(h+2,f.x,f.y,f.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let n=0,i=e.count;n<i;n++)Pt.fromBufferAttribute(e,n),Pt.normalize(),e.setXYZ(n,Pt.x,Pt.y,Pt.z)}toNonIndexed(){function e(a,l){const c=a.array,f=a.itemSize,d=a.normalized,h=new c.constructor(l.length*f);let p=0,g=0;for(let x=0,m=l.length;x<m;x++){a.isInterleavedBufferAttribute?p=l[x]*a.data.stride+a.offset:p=l[x]*f;for(let u=0;u<f;u++)h[g++]=c[p++]}return new ri(h,f,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const n=new Sn,i=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,i);n.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let f=0,d=c.length;f<d;f++){const h=c[f],p=e(h,i);l.push(p)}n.morphAttributes[a]=l}n.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];n.addGroup(c.start,c.count,c.materialIndex)}return n}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const n=this.index;n!==null&&(e.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],f=[];for(let d=0,h=c.length;d<h;d++){const p=c[d];f.push(p.toJSON(e.data))}f.length>0&&(r[l]=f,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const n={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(n));const r=e.attributes;for(const c in r){const f=r[c];this.setAttribute(c,f.clone(n))}const s=e.morphAttributes;for(const c in s){const f=[],d=s[c];for(let h=0,p=d.length;h<p;h++)f.push(d[h].clone(n));this.morphAttributes[c]=f}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,f=o.length;c<f;c++){const d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Kp=new ot,mr=new fc,Oa=new dc,Zp=new F,es=new F,ts=new F,ns=new F,pu=new F,ka=new F,za=new ye,Ba=new ye,Ha=new ye,Qp=new F,Jp=new F,em=new F,Va=new F,Ga=new F;class Dt extends At{constructor(e=new Sn,n=new hc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=n,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){const r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,n){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;n.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){ka.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const f=a[l],d=s[l];f!==0&&(pu.fromBufferAttribute(d,e),o?ka.addScaledVector(pu,f):ka.addScaledVector(pu.sub(n),f))}n.add(ka)}return n}raycast(e,n){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Oa.copy(i.boundingSphere),Oa.applyMatrix4(s),mr.copy(e.ray).recast(e.near),!(Oa.containsPoint(mr.origin)===!1&&(mr.intersectSphere(Oa,Zp)===null||mr.origin.distanceToSquared(Zp)>(e.far-e.near)**2))&&(Kp.copy(s).invert(),mr.copy(e.ray).applyMatrix4(Kp),!(i.boundingBox!==null&&mr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,n,mr)))}_computeIntersections(e,n,i){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,f=s.attributes.uv1,d=s.attributes.normal,h=s.groups,p=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=h.length;g<x;g++){const m=h[g],u=o[m.materialIndex],v=Math.max(m.start,p.start),_=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let M=v,b=_;M<b;M+=3){const C=a.getX(M),A=a.getX(M+1),L=a.getX(M+2);r=ja(this,u,e,i,c,f,d,C,A,L),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,n.push(r))}}else{const g=Math.max(0,p.start),x=Math.min(a.count,p.start+p.count);for(let m=g,u=x;m<u;m+=3){const v=a.getX(m),_=a.getX(m+1),M=a.getX(m+2);r=ja(this,o,e,i,c,f,d,v,_,M),r&&(r.faceIndex=Math.floor(m/3),n.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=h.length;g<x;g++){const m=h[g],u=o[m.materialIndex],v=Math.max(m.start,p.start),_=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let M=v,b=_;M<b;M+=3){const C=M,A=M+1,L=M+2;r=ja(this,u,e,i,c,f,d,C,A,L),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,n.push(r))}}else{const g=Math.max(0,p.start),x=Math.min(l.count,p.start+p.count);for(let m=g,u=x;m<u;m+=3){const v=m,_=m+1,M=m+2;r=ja(this,o,e,i,c,f,d,v,_,M),r&&(r.faceIndex=Math.floor(m/3),n.push(r))}}}}function qM(t,e,n,i,r,s,o,a){let l;if(e.side===ln?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,e.side===or,a),l===null)return null;Ga.copy(a),Ga.applyMatrix4(t.matrixWorld);const c=n.ray.origin.distanceTo(Ga);return c<n.near||c>n.far?null:{distance:c,point:Ga.clone(),object:t}}function ja(t,e,n,i,r,s,o,a,l,c){t.getVertexPosition(a,es),t.getVertexPosition(l,ts),t.getVertexPosition(c,ns);const f=qM(t,e,n,i,es,ts,ns,Va);if(f){r&&(za.fromBufferAttribute(r,a),Ba.fromBufferAttribute(r,l),Ha.fromBufferAttribute(r,c),f.uv=ei.getInterpolation(Va,es,ts,ns,za,Ba,Ha,new ye)),s&&(za.fromBufferAttribute(s,a),Ba.fromBufferAttribute(s,l),Ha.fromBufferAttribute(s,c),f.uv1=ei.getInterpolation(Va,es,ts,ns,za,Ba,Ha,new ye)),o&&(Qp.fromBufferAttribute(o,a),Jp.fromBufferAttribute(o,l),em.fromBufferAttribute(o,c),f.normal=ei.getInterpolation(Va,es,ts,ns,Qp,Jp,em,new F),f.normal.dot(i.direction)>0&&f.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new F,materialIndex:0};ei.getNormal(es,ts,ns,d.normal),f.face=d}return f}class zr extends Sn{constructor(e=1,n=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:n,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],f=[],d=[];let h=0,p=0;g("z","y","x",-1,-1,i,n,e,o,s,0),g("z","y","x",1,-1,i,n,-e,o,s,1),g("x","z","y",1,1,e,i,n,r,o,2),g("x","z","y",1,-1,e,i,-n,r,o,3),g("x","y","z",1,-1,e,n,i,r,s,4),g("x","y","z",-1,-1,e,n,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new vt(c,3)),this.setAttribute("normal",new vt(f,3)),this.setAttribute("uv",new vt(d,2));function g(x,m,u,v,_,M,b,C,A,L,T){const S=M/A,U=b/L,k=M/2,D=b/2,V=C/2,z=A+1,O=L+1;let Z=0,I=0;const G=new F;for(let X=0;X<O;X++){const ee=X*U-D;for(let ue=0;ue<z;ue++){const be=ue*S-k;G[x]=be*v,G[m]=ee*_,G[u]=V,c.push(G.x,G.y,G.z),G[x]=0,G[m]=0,G[u]=C>0?1:-1,f.push(G.x,G.y,G.z),d.push(ue/A),d.push(1-X/L),Z+=1}}for(let X=0;X<L;X++)for(let ee=0;ee<A;ee++){const ue=h+ee+z*X,be=h+ee+z*(X+1),K=h+(ee+1)+z*(X+1),ne=h+(ee+1)+z*X;l.push(ue,be,ne),l.push(be,K,ne),I+=6}a.addGroup(p,I,T),p+=I,h+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Vs(t){const e={};for(const n in t){e[n]={};for(const i in t[n]){const r=t[n][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[n][i]=null):e[n][i]=r.clone():Array.isArray(r)?e[n][i]=r.slice():e[n][i]=r}}return e}function qt(t){const e={};for(let n=0;n<t.length;n++){const i=Vs(t[n]);for(const r in i)e[r]=i[r]}return e}function KM(t){const e=[];for(let n=0;n<t.length;n++)e.push(t[n].clone());return e}function $v(t){const e=t.getRenderTarget();return e===null?t.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}const ta={clone:Vs,merge:qt};var ZM=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,QM=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Zt extends Ys{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=ZM,this.fragmentShader=QM,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Vs(e.uniforms),this.uniformsGroups=KM(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const n=super.toJSON(e);n.glslVersion=this.glslVersion,n.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?n.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?n.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?n.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?n.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?n.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?n.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?n.uniforms[r]={type:"m4",value:o.toArray()}:n.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}}class Yv extends At{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ot,this.projectionMatrix=new ot,this.projectionMatrixInverse=new ot,this.coordinateSystem=xi}copy(e,n){return super.copy(e,n),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,n){super.updateWorldMatrix(e,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Oi=new F,tm=new ye,nm=new ye;class Rn extends Yv{constructor(e=50,n=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const n=.5*this.getFilmHeight()/e;this.fov=ea*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Do*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ea*2*Math.atan(Math.tan(Do*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,n,i){Oi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Oi.x,Oi.y).multiplyScalar(-e/Oi.z),Oi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Oi.x,Oi.y).multiplyScalar(-e/Oi.z)}getViewSize(e,n){return this.getViewBounds(e,tm,nm),n.subVectors(nm,tm)}setViewOffset(e,n,i,r,s,o){this.aspect=e/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let n=e*Math.tan(Do*.5*this.fov)/this.zoom,i=2*n,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,n-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,n,n-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const n=super.toJSON(e);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}}const is=-90,rs=1;class JM extends At{constructor(e,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Rn(is,rs,e,n);r.layers=this.layers,this.add(r);const s=new Rn(is,rs,e,n);s.layers=this.layers,this.add(s);const o=new Rn(is,rs,e,n);o.layers=this.layers,this.add(o);const a=new Rn(is,rs,e,n);a.layers=this.layers,this.add(a);const l=new Rn(is,rs,e,n);l.layers=this.layers,this.add(l);const c=new Rn(is,rs,e,n);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,n=this.children.concat(),[i,r,s,o,a,l]=n;for(const c of n)this.remove(c);if(e===xi)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Hl)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of n)this.add(c),c.updateMatrixWorld()}update(e,n){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,f]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(n,s),e.setRenderTarget(i,1,r),e.render(n,o),e.setRenderTarget(i,2,r),e.render(n,a),e.setRenderTarget(i,3,r),e.render(n,l),e.setRenderTarget(i,4,r),e.render(n,c),i.texture.generateMipmaps=x,e.setRenderTarget(i,5,r),e.render(n,f),e.setRenderTarget(d,h,p),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class qv extends cn{constructor(e,n,i,r,s,o,a,l,c,f){e=e!==void 0?e:[],n=n!==void 0?n:zs,super(e,n,i,r,s,o,a,l,c,f),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class eE extends $n{constructor(e=1,n={}){super(e,e,n),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new qv(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=n.generateMipmaps!==void 0?n.generateMipmaps:!1,this.texture.minFilter=n.minFilter!==void 0?n.minFilter:jn}fromEquirectangularTexture(e,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new zr(5,5,5),s=new Zt({name:"CubemapFromEquirect",uniforms:Vs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:ln,blending:Si});s.uniforms.tEquirect.value=n;const o=new Dt(r,s),a=n.minFilter;return n.minFilter===Rr&&(n.minFilter=jn),new JM(1,10,this).update(e,o),n.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,n,i,r){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(n,i,r);e.setRenderTarget(s)}}const mu=new F,tE=new F,nE=new Be;class Bi{constructor(e=new F(1,0,0),n=0){this.isPlane=!0,this.normal=e,this.constant=n}set(e,n){return this.normal.copy(e),this.constant=n,this}setComponents(e,n,i,r){return this.normal.set(e,n,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,n){return this.normal.copy(e),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(e,n,i){const r=mu.subVectors(i,n).cross(tE.subVectors(e,n)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,n){return n.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,n){const i=e.delta(mu),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?n.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:n.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const n=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return n<0&&i>0||i<0&&n>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,n){const i=n||nE.getNormalMatrix(e),r=this.coplanarPoint(mu).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const gr=new dc,Wa=new F;class Df{constructor(e=new Bi,n=new Bi,i=new Bi,r=new Bi,s=new Bi,o=new Bi){this.planes=[e,n,i,r,s,o]}set(e,n,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(n),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const n=this.planes;for(let i=0;i<6;i++)n[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,n=xi){const i=this.planes,r=e.elements,s=r[0],o=r[1],a=r[2],l=r[3],c=r[4],f=r[5],d=r[6],h=r[7],p=r[8],g=r[9],x=r[10],m=r[11],u=r[12],v=r[13],_=r[14],M=r[15];if(i[0].setComponents(l-s,h-c,m-p,M-u).normalize(),i[1].setComponents(l+s,h+c,m+p,M+u).normalize(),i[2].setComponents(l+o,h+f,m+g,M+v).normalize(),i[3].setComponents(l-o,h-f,m-g,M-v).normalize(),i[4].setComponents(l-a,h-d,m-x,M-_).normalize(),n===xi)i[5].setComponents(l+a,h+d,m+x,M+_).normalize();else if(n===Hl)i[5].setComponents(a,d,x,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),gr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const n=e.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),gr.copy(n.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(gr)}intersectsSprite(e){return gr.center.set(0,0,0),gr.radius=.7071067811865476,gr.applyMatrix4(e.matrixWorld),this.intersectsSphere(gr)}intersectsSphere(e){const n=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const n=this.planes;for(let i=0;i<6;i++){const r=n[i];if(Wa.x=r.normal.x>0?e.max.x:e.min.x,Wa.y=r.normal.y>0?e.max.y:e.min.y,Wa.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Wa)<0)return!1}return!0}containsPoint(e){const n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Kv(){let t=null,e=!1,n=null,i=null;function r(s,o){n(s,o),i=t.requestAnimationFrame(r)}return{start:function(){e!==!0&&n!==null&&(i=t.requestAnimationFrame(r),e=!0)},stop:function(){t.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){n=s},setContext:function(s){t=s}}}function iE(t){const e=new WeakMap;function n(a,l){const c=a.array,f=a.usage,d=c.byteLength,h=t.createBuffer();t.bindBuffer(l,h),t.bufferData(l,c,f),a.onUploadCallback();let p;if(c instanceof Float32Array)p=t.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?p=t.HALF_FLOAT:p=t.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=t.SHORT;else if(c instanceof Uint32Array)p=t.UNSIGNED_INT;else if(c instanceof Int32Array)p=t.INT;else if(c instanceof Int8Array)p=t.BYTE;else if(c instanceof Uint8Array)p=t.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=t.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function i(a,l,c){const f=l.array,d=l._updateRange,h=l.updateRanges;if(t.bindBuffer(c,a),d.count===-1&&h.length===0&&t.bufferSubData(c,0,f),h.length!==0){for(let p=0,g=h.length;p<g;p++){const x=h[p];t.bufferSubData(c,x.start*f.BYTES_PER_ELEMENT,f,x.start,x.count)}l.clearUpdateRanges()}d.count!==-1&&(t.bufferSubData(c,d.offset*f.BYTES_PER_ELEMENT,f,d.offset,d.count),d.count=-1),l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(t.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isGLBufferAttribute){const f=e.get(a);(!f||f.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);if(c===void 0)e.set(a,n(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}class qs extends Sn{constructor(e=1,n=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:n,widthSegments:i,heightSegments:r};const s=e/2,o=n/2,a=Math.floor(i),l=Math.floor(r),c=a+1,f=l+1,d=e/a,h=n/l,p=[],g=[],x=[],m=[];for(let u=0;u<f;u++){const v=u*h-o;for(let _=0;_<c;_++){const M=_*d-s;g.push(M,-v,0),x.push(0,0,1),m.push(_/a),m.push(1-u/l)}}for(let u=0;u<l;u++)for(let v=0;v<a;v++){const _=v+c*u,M=v+c*(u+1),b=v+1+c*(u+1),C=v+1+c*u;p.push(_,M,C),p.push(M,b,C)}this.setIndex(p),this.setAttribute("position",new vt(g,3)),this.setAttribute("normal",new vt(x,3)),this.setAttribute("uv",new vt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new qs(e.width,e.height,e.widthSegments,e.heightSegments)}}var rE=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,sE=`#ifdef USE_ALPHAHASH
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
#endif`,oE=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,aE=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lE=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,cE=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,uE=`#ifdef USE_AOMAP
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
#endif`,dE=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,fE=`#ifdef USE_BATCHING
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
#endif`,hE=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,pE=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mE=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,gE=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,vE=`#ifdef USE_IRIDESCENCE
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
#endif`,_E=`#ifdef USE_BUMPMAP
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
#endif`,xE=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,yE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,SE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,ME=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,EE=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,TE=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,wE=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,AE=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,CE=`#define PI 3.141592653589793
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
} // validated`,RE=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,bE=`vec3 transformedNormal = objectNormal;
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
#endif`,PE=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,LE=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,NE=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,DE=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,IE="gl_FragColor = linearToOutputTexel( gl_FragColor );",UE=`
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
}`,FE=`#ifdef USE_ENVMAP
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
#endif`,OE=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,kE=`#ifdef USE_ENVMAP
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
#endif`,zE=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,BE=`#ifdef USE_ENVMAP
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
#endif`,HE=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,VE=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,GE=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,jE=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,WE=`#ifdef USE_GRADIENTMAP
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
}`,XE=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$E=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,YE=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,qE=`uniform bool receiveShadow;
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
#endif`,KE=`#ifdef USE_ENVMAP
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
#endif`,ZE=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,QE=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,JE=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,e1=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,t1=`PhysicalMaterial material;
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
#endif`,n1=`struct PhysicalMaterial {
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
}`,i1=`
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
#endif`,r1=`#if defined( RE_IndirectDiffuse )
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
#endif`,s1=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,o1=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,a1=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,l1=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,c1=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,u1=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,d1=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,f1=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,h1=`#if defined( USE_POINTS_UV )
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
#endif`,p1=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,m1=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,g1=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[MORPHTARGETS_COUNT];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,v1=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_1=`#ifdef USE_MORPHNORMALS
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
#endif`,x1=`#ifdef USE_MORPHTARGETS
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
#endif`,y1=`#ifdef USE_MORPHTARGETS
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
#endif`,S1=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,M1=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,E1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,T1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,w1=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,A1=`#ifdef USE_NORMALMAP
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
#endif`,C1=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,R1=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,b1=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,P1=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,L1=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,N1=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,D1=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,I1=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,U1=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,F1=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,O1=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,k1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,z1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,B1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,H1=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,V1=`float getShadowMask() {
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
}`,G1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,j1=`#ifdef USE_SKINNING
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
#endif`,W1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,X1=`#ifdef USE_SKINNING
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
#endif`,$1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Y1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,q1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,K1=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Z1=`#ifdef USE_TRANSMISSION
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
#endif`,Q1=`#ifdef USE_TRANSMISSION
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
#endif`,J1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,eT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,tT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,nT=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const iT=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,rT=`uniform sampler2D t2D;
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
}`,sT=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,oT=`#ifdef ENVMAP_TYPE_CUBE
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
}`,aT=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,lT=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cT=`#include <common>
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
}`,uT=`#if DEPTH_PACKING == 3200
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
}`,dT=`#define DISTANCE
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
}`,fT=`#define DISTANCE
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
}`,hT=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pT=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mT=`uniform float scale;
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
}`,gT=`uniform vec3 diffuse;
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
}`,vT=`#include <common>
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
}`,_T=`uniform vec3 diffuse;
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
}`,xT=`#define LAMBERT
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
}`,yT=`#define LAMBERT
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
}`,ST=`#define MATCAP
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
}`,MT=`#define MATCAP
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
}`,ET=`#define NORMAL
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
}`,TT=`#define NORMAL
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
}`,wT=`#define PHONG
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
}`,AT=`#define PHONG
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
}`,CT=`#define STANDARD
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
}`,RT=`#define STANDARD
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
}`,bT=`#define TOON
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
}`,PT=`#define TOON
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
}`,LT=`uniform float size;
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
}`,NT=`uniform vec3 diffuse;
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
}`,DT=`#include <common>
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
}`,IT=`uniform vec3 color;
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
}`,UT=`uniform float rotation;
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
}`,FT=`uniform vec3 diffuse;
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
}`,ze={alphahash_fragment:rE,alphahash_pars_fragment:sE,alphamap_fragment:oE,alphamap_pars_fragment:aE,alphatest_fragment:lE,alphatest_pars_fragment:cE,aomap_fragment:uE,aomap_pars_fragment:dE,batching_pars_vertex:fE,batching_vertex:hE,begin_vertex:pE,beginnormal_vertex:mE,bsdfs:gE,iridescence_fragment:vE,bumpmap_pars_fragment:_E,clipping_planes_fragment:xE,clipping_planes_pars_fragment:yE,clipping_planes_pars_vertex:SE,clipping_planes_vertex:ME,color_fragment:EE,color_pars_fragment:TE,color_pars_vertex:wE,color_vertex:AE,common:CE,cube_uv_reflection_fragment:RE,defaultnormal_vertex:bE,displacementmap_pars_vertex:PE,displacementmap_vertex:LE,emissivemap_fragment:NE,emissivemap_pars_fragment:DE,colorspace_fragment:IE,colorspace_pars_fragment:UE,envmap_fragment:FE,envmap_common_pars_fragment:OE,envmap_pars_fragment:kE,envmap_pars_vertex:zE,envmap_physical_pars_fragment:KE,envmap_vertex:BE,fog_vertex:HE,fog_pars_vertex:VE,fog_fragment:GE,fog_pars_fragment:jE,gradientmap_pars_fragment:WE,lightmap_pars_fragment:XE,lights_lambert_fragment:$E,lights_lambert_pars_fragment:YE,lights_pars_begin:qE,lights_toon_fragment:ZE,lights_toon_pars_fragment:QE,lights_phong_fragment:JE,lights_phong_pars_fragment:e1,lights_physical_fragment:t1,lights_physical_pars_fragment:n1,lights_fragment_begin:i1,lights_fragment_maps:r1,lights_fragment_end:s1,logdepthbuf_fragment:o1,logdepthbuf_pars_fragment:a1,logdepthbuf_pars_vertex:l1,logdepthbuf_vertex:c1,map_fragment:u1,map_pars_fragment:d1,map_particle_fragment:f1,map_particle_pars_fragment:h1,metalnessmap_fragment:p1,metalnessmap_pars_fragment:m1,morphinstance_vertex:g1,morphcolor_vertex:v1,morphnormal_vertex:_1,morphtarget_pars_vertex:x1,morphtarget_vertex:y1,normal_fragment_begin:S1,normal_fragment_maps:M1,normal_pars_fragment:E1,normal_pars_vertex:T1,normal_vertex:w1,normalmap_pars_fragment:A1,clearcoat_normal_fragment_begin:C1,clearcoat_normal_fragment_maps:R1,clearcoat_pars_fragment:b1,iridescence_pars_fragment:P1,opaque_fragment:L1,packing:N1,premultiplied_alpha_fragment:D1,project_vertex:I1,dithering_fragment:U1,dithering_pars_fragment:F1,roughnessmap_fragment:O1,roughnessmap_pars_fragment:k1,shadowmap_pars_fragment:z1,shadowmap_pars_vertex:B1,shadowmap_vertex:H1,shadowmask_pars_fragment:V1,skinbase_vertex:G1,skinning_pars_vertex:j1,skinning_vertex:W1,skinnormal_vertex:X1,specularmap_fragment:$1,specularmap_pars_fragment:Y1,tonemapping_fragment:q1,tonemapping_pars_fragment:K1,transmission_fragment:Z1,transmission_pars_fragment:Q1,uv_pars_fragment:J1,uv_pars_vertex:eT,uv_vertex:tT,worldpos_vertex:nT,background_vert:iT,background_frag:rT,backgroundCube_vert:sT,backgroundCube_frag:oT,cube_vert:aT,cube_frag:lT,depth_vert:cT,depth_frag:uT,distanceRGBA_vert:dT,distanceRGBA_frag:fT,equirect_vert:hT,equirect_frag:pT,linedashed_vert:mT,linedashed_frag:gT,meshbasic_vert:vT,meshbasic_frag:_T,meshlambert_vert:xT,meshlambert_frag:yT,meshmatcap_vert:ST,meshmatcap_frag:MT,meshnormal_vert:ET,meshnormal_frag:TT,meshphong_vert:wT,meshphong_frag:AT,meshphysical_vert:CT,meshphysical_frag:RT,meshtoon_vert:bT,meshtoon_frag:PT,points_vert:LT,points_frag:NT,shadow_vert:DT,shadow_frag:IT,sprite_vert:UT,sprite_frag:FT},de={common:{diffuse:{value:new Ge(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new ye(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ge(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ge(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new Ge(16777215)},opacity:{value:1},center:{value:new ye(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},Zn={basic:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.fog]),vertexShader:ze.meshbasic_vert,fragmentShader:ze.meshbasic_frag},lambert:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new Ge(0)}}]),vertexShader:ze.meshlambert_vert,fragmentShader:ze.meshlambert_frag},phong:{uniforms:qt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new Ge(0)},specular:{value:new Ge(1118481)},shininess:{value:30}}]),vertexShader:ze.meshphong_vert,fragmentShader:ze.meshphong_frag},standard:{uniforms:qt([de.common,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.roughnessmap,de.metalnessmap,de.fog,de.lights,{emissive:{value:new Ge(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ze.meshphysical_vert,fragmentShader:ze.meshphysical_frag},toon:{uniforms:qt([de.common,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.gradientmap,de.fog,de.lights,{emissive:{value:new Ge(0)}}]),vertexShader:ze.meshtoon_vert,fragmentShader:ze.meshtoon_frag},matcap:{uniforms:qt([de.common,de.bumpmap,de.normalmap,de.displacementmap,de.fog,{matcap:{value:null}}]),vertexShader:ze.meshmatcap_vert,fragmentShader:ze.meshmatcap_frag},points:{uniforms:qt([de.points,de.fog]),vertexShader:ze.points_vert,fragmentShader:ze.points_frag},dashed:{uniforms:qt([de.common,de.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ze.linedashed_vert,fragmentShader:ze.linedashed_frag},depth:{uniforms:qt([de.common,de.displacementmap]),vertexShader:ze.depth_vert,fragmentShader:ze.depth_frag},normal:{uniforms:qt([de.common,de.bumpmap,de.normalmap,de.displacementmap,{opacity:{value:1}}]),vertexShader:ze.meshnormal_vert,fragmentShader:ze.meshnormal_frag},sprite:{uniforms:qt([de.sprite,de.fog]),vertexShader:ze.sprite_vert,fragmentShader:ze.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ze.background_vert,fragmentShader:ze.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:ze.backgroundCube_vert,fragmentShader:ze.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ze.cube_vert,fragmentShader:ze.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ze.equirect_vert,fragmentShader:ze.equirect_frag},distanceRGBA:{uniforms:qt([de.common,de.displacementmap,{referencePosition:{value:new F},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ze.distanceRGBA_vert,fragmentShader:ze.distanceRGBA_frag},shadow:{uniforms:qt([de.lights,de.fog,{color:{value:new Ge(0)},opacity:{value:1}}]),vertexShader:ze.shadow_vert,fragmentShader:ze.shadow_frag}};Zn.physical={uniforms:qt([Zn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new ye(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new Ge(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new ye},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new Ge(0)},specularColor:{value:new Ge(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new ye},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:ze.meshphysical_vert,fragmentShader:ze.meshphysical_frag};const Xa={r:0,b:0,g:0},vr=new si,OT=new ot;function kT(t,e,n,i,r,s,o){const a=new Ge(0);let l=s===!0?0:1,c,f,d=null,h=0,p=null;function g(v){let _=v.isScene===!0?v.background:null;return _&&_.isTexture&&(_=(v.backgroundBlurriness>0?n:e).get(_)),_}function x(v){let _=!1;const M=g(v);M===null?u(a,l):M&&M.isColor&&(u(M,1),_=!0);const b=t.xr.getEnvironmentBlendMode();b==="additive"?i.buffers.color.setClear(0,0,0,1,o):b==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(t.autoClear||_)&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil)}function m(v,_){const M=g(_);M&&(M.isCubeTexture||M.mapping===cc)?(f===void 0&&(f=new Dt(new zr(1,1,1),new Zt({name:"BackgroundCubeMaterial",uniforms:Vs(Zn.backgroundCube.uniforms),vertexShader:Zn.backgroundCube.vertexShader,fragmentShader:Zn.backgroundCube.fragmentShader,side:ln,depthTest:!1,depthWrite:!1,fog:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(b,C,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),vr.copy(_.backgroundRotation),vr.x*=-1,vr.y*=-1,vr.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(vr.y*=-1,vr.z*=-1),f.material.uniforms.envMap.value=M,f.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,f.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(OT.makeRotationFromEuler(vr)),f.material.toneMapped=tt.getTransfer(M.colorSpace)!==rt,(d!==M||h!==M.version||p!==t.toneMapping)&&(f.material.needsUpdate=!0,d=M,h=M.version,p=t.toneMapping),f.layers.enableAll(),v.unshift(f,f.geometry,f.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new Dt(new qs(2,2),new Zt({name:"BackgroundMaterial",uniforms:Vs(Zn.background.uniforms),vertexShader:Zn.background.vertexShader,fragmentShader:Zn.background.fragmentShader,side:or,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,c.material.toneMapped=tt.getTransfer(M.colorSpace)!==rt,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(d!==M||h!==M.version||p!==t.toneMapping)&&(c.material.needsUpdate=!0,d=M,h=M.version,p=t.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null))}function u(v,_){v.getRGB(Xa,$v(t)),i.buffers.color.setClear(Xa.r,Xa.g,Xa.b,_,o)}return{getClearColor:function(){return a},setClearColor:function(v,_=1){a.set(v),l=_,u(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(v){l=v,u(a,l)},render:x,addToRenderList:m}}function zT(t,e){const n=t.getParameter(t.MAX_VERTEX_ATTRIBS),i={},r=h(null);let s=r,o=!1;function a(S,U,k,D,V){let z=!1;const O=d(D,k,U);s!==O&&(s=O,c(s.object)),z=p(S,D,k,V),z&&g(S,D,k,V),V!==null&&e.update(V,t.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,M(S,U,k,D),V!==null&&t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,e.get(V).buffer))}function l(){return t.createVertexArray()}function c(S){return t.bindVertexArray(S)}function f(S){return t.deleteVertexArray(S)}function d(S,U,k){const D=k.wireframe===!0;let V=i[S.id];V===void 0&&(V={},i[S.id]=V);let z=V[U.id];z===void 0&&(z={},V[U.id]=z);let O=z[D];return O===void 0&&(O=h(l()),z[D]=O),O}function h(S){const U=[],k=[],D=[];for(let V=0;V<n;V++)U[V]=0,k[V]=0,D[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:U,enabledAttributes:k,attributeDivisors:D,object:S,attributes:{},index:null}}function p(S,U,k,D){const V=s.attributes,z=U.attributes;let O=0;const Z=k.getAttributes();for(const I in Z)if(Z[I].location>=0){const X=V[I];let ee=z[I];if(ee===void 0&&(I==="instanceMatrix"&&S.instanceMatrix&&(ee=S.instanceMatrix),I==="instanceColor"&&S.instanceColor&&(ee=S.instanceColor)),X===void 0||X.attribute!==ee||ee&&X.data!==ee.data)return!0;O++}return s.attributesNum!==O||s.index!==D}function g(S,U,k,D){const V={},z=U.attributes;let O=0;const Z=k.getAttributes();for(const I in Z)if(Z[I].location>=0){let X=z[I];X===void 0&&(I==="instanceMatrix"&&S.instanceMatrix&&(X=S.instanceMatrix),I==="instanceColor"&&S.instanceColor&&(X=S.instanceColor));const ee={};ee.attribute=X,X&&X.data&&(ee.data=X.data),V[I]=ee,O++}s.attributes=V,s.attributesNum=O,s.index=D}function x(){const S=s.newAttributes;for(let U=0,k=S.length;U<k;U++)S[U]=0}function m(S){u(S,0)}function u(S,U){const k=s.newAttributes,D=s.enabledAttributes,V=s.attributeDivisors;k[S]=1,D[S]===0&&(t.enableVertexAttribArray(S),D[S]=1),V[S]!==U&&(t.vertexAttribDivisor(S,U),V[S]=U)}function v(){const S=s.newAttributes,U=s.enabledAttributes;for(let k=0,D=U.length;k<D;k++)U[k]!==S[k]&&(t.disableVertexAttribArray(k),U[k]=0)}function _(S,U,k,D,V,z,O){O===!0?t.vertexAttribIPointer(S,U,k,V,z):t.vertexAttribPointer(S,U,k,D,V,z)}function M(S,U,k,D){x();const V=D.attributes,z=k.getAttributes(),O=U.defaultAttributeValues;for(const Z in z){const I=z[Z];if(I.location>=0){let G=V[Z];if(G===void 0&&(Z==="instanceMatrix"&&S.instanceMatrix&&(G=S.instanceMatrix),Z==="instanceColor"&&S.instanceColor&&(G=S.instanceColor)),G!==void 0){const X=G.normalized,ee=G.itemSize,ue=e.get(G);if(ue===void 0)continue;const be=ue.buffer,K=ue.type,ne=ue.bytesPerElement,he=K===t.INT||K===t.UNSIGNED_INT||G.gpuType===Nv;if(G.isInterleavedBufferAttribute){const ae=G.data,He=ae.stride,Ne=G.offset;if(ae.isInstancedInterleavedBuffer){for(let N=0;N<I.locationSize;N++)u(I.location+N,ae.meshPerAttribute);S.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let N=0;N<I.locationSize;N++)m(I.location+N);t.bindBuffer(t.ARRAY_BUFFER,be);for(let N=0;N<I.locationSize;N++)_(I.location+N,ee/I.locationSize,K,X,He*ne,(Ne+ee/I.locationSize*N)*ne,he)}else{if(G.isInstancedBufferAttribute){for(let ae=0;ae<I.locationSize;ae++)u(I.location+ae,G.meshPerAttribute);S.isInstancedMesh!==!0&&D._maxInstanceCount===void 0&&(D._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let ae=0;ae<I.locationSize;ae++)m(I.location+ae);t.bindBuffer(t.ARRAY_BUFFER,be);for(let ae=0;ae<I.locationSize;ae++)_(I.location+ae,ee/I.locationSize,K,X,ee*ne,ee/I.locationSize*ae*ne,he)}}else if(O!==void 0){const X=O[Z];if(X!==void 0)switch(X.length){case 2:t.vertexAttrib2fv(I.location,X);break;case 3:t.vertexAttrib3fv(I.location,X);break;case 4:t.vertexAttrib4fv(I.location,X);break;default:t.vertexAttrib1fv(I.location,X)}}}}v()}function b(){L();for(const S in i){const U=i[S];for(const k in U){const D=U[k];for(const V in D)f(D[V].object),delete D[V];delete U[k]}delete i[S]}}function C(S){if(i[S.id]===void 0)return;const U=i[S.id];for(const k in U){const D=U[k];for(const V in D)f(D[V].object),delete D[V];delete U[k]}delete i[S.id]}function A(S){for(const U in i){const k=i[U];if(k[S.id]===void 0)continue;const D=k[S.id];for(const V in D)f(D[V].object),delete D[V];delete k[S.id]}}function L(){T(),o=!0,s!==r&&(s=r,c(s.object))}function T(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:L,resetDefaultState:T,dispose:b,releaseStatesOfGeometry:C,releaseStatesOfProgram:A,initAttributes:x,enableAttribute:m,disableUnusedAttributes:v}}function BT(t,e,n){let i;function r(c){i=c}function s(c,f){t.drawArrays(i,c,f),n.update(f,i,1)}function o(c,f,d){d!==0&&(t.drawArraysInstanced(i,c,f,d),n.update(f,i,d))}function a(c,f,d){if(d===0)return;const h=e.get("WEBGL_multi_draw");if(h===null)for(let p=0;p<d;p++)this.render(c[p],f[p]);else{h.multiDrawArraysWEBGL(i,c,0,f,0,d);let p=0;for(let g=0;g<d;g++)p+=f[g];n.update(p,i,1)}}function l(c,f,d,h){if(d===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)o(c[g],f[g],h[g]);else{p.multiDrawArraysInstancedWEBGL(i,c,0,f,0,h,0,d);let g=0;for(let x=0;x<d;x++)g+=f[x];for(let x=0;x<h.length;x++)n.update(g,i,h[x])}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function HT(t,e,n,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const C=e.get("EXT_texture_filter_anisotropic");r=t.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(C){return!(C!==ti&&i.convert(C)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){const A=C===ir&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(C!==ar&&i.convert(C)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==$i&&!A)}function l(C){if(C==="highp"){if(t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.HIGH_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.MEDIUM_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=n.precision!==void 0?n.precision:"highp";const f=l(c);f!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",f,"instead."),c=f);const d=n.logarithmicDepthBuffer===!0,h=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),p=t.getParameter(t.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=t.getParameter(t.MAX_TEXTURE_SIZE),x=t.getParameter(t.MAX_CUBE_MAP_TEXTURE_SIZE),m=t.getParameter(t.MAX_VERTEX_ATTRIBS),u=t.getParameter(t.MAX_VERTEX_UNIFORM_VECTORS),v=t.getParameter(t.MAX_VARYING_VECTORS),_=t.getParameter(t.MAX_FRAGMENT_UNIFORM_VECTORS),M=p>0,b=t.getParameter(t.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,maxTextures:h,maxVertexTextures:p,maxTextureSize:g,maxCubemapSize:x,maxAttributes:m,maxVertexUniforms:u,maxVaryings:v,maxFragmentUniforms:_,vertexTextures:M,maxSamples:b}}function VT(t){const e=this;let n=null,i=0,r=!1,s=!1;const o=new Bi,a=new Be,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){const p=d.length!==0||h||i!==0||r;return r=h,i=d.length,p},this.beginShadows=function(){s=!0,f(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,h){n=f(d,h,0)},this.setState=function(d,h,p){const g=d.clippingPlanes,x=d.clipIntersection,m=d.clipShadows,u=t.get(d);if(!r||g===null||g.length===0||s&&!m)s?f(null):c();else{const v=s?0:i,_=v*4;let M=u.clippingState||null;l.value=M,M=f(g,h,_,p);for(let b=0;b!==_;++b)M[b]=n[b];u.clippingState=M,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==n&&(l.value=n,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function f(d,h,p,g){const x=d!==null?d.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const u=p+x*4,v=h.matrixWorldInverse;a.getNormalMatrix(v),(m===null||m.length<u)&&(m=new Float32Array(u));for(let _=0,M=p;_!==x;++_,M+=4)o.copy(d[_]).applyMatrix4(v,a),o.normal.toArray(m,M),m[M+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function GT(t){let e=new WeakMap;function n(o,a){return a===wd?o.mapping=zs:a===Ad&&(o.mapping=Bs),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===wd||a===Ad)if(e.has(o)){const l=e.get(o).texture;return n(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new eE(l.height);return c.fromEquirectangularTexture(t,o),e.set(o,c),o.addEventListener("dispose",r),n(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class If extends Yv{constructor(e=-1,n=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=n,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,n){return super.copy(e,n),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,n,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+n,l=r-n;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,f=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=f*this.view.offsetY,l=a-f*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const n=super.toJSON(e);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}}const Ss=4,im=[.125,.215,.35,.446,.526,.582],Er=20,gu=new If,rm=new Ge;let vu=null,_u=0,xu=0,yu=!1;const Sr=(1+Math.sqrt(5))/2,ss=1/Sr,sm=[new F(-Sr,ss,0),new F(Sr,ss,0),new F(-ss,0,Sr),new F(ss,0,Sr),new F(0,Sr,-ss),new F(0,Sr,ss),new F(-1,1,-1),new F(1,1,-1),new F(-1,1,1),new F(1,1,1)];class om{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,n=0,i=.1,r=100){vu=this._renderer.getRenderTarget(),_u=this._renderer.getActiveCubeFace(),xu=this._renderer.getActiveMipmapLevel(),yu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),n>0&&this._blur(s,0,0,n),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,n=null){return this._fromTexture(e,n)}fromCubemap(e,n=null){return this._fromTexture(e,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=cm(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=lm(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(vu,_u,xu),this._renderer.xr.enabled=yu,e.scissorTest=!1,$a(e,0,0,e.width,e.height)}_fromTexture(e,n){e.mapping===zs||e.mapping===Bs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),vu=this._renderer.getRenderTarget(),_u=this._renderer.getActiveCubeFace(),xu=this._renderer.getActiveMipmapLevel(),yu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=n||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:jn,minFilter:jn,generateMipmaps:!1,type:ir,format:ti,colorSpace:dr,depthBuffer:!1},r=am(e,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=am(e,n,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=jT(s)),this._blurMaterial=WT(s,e,n)}return r}_compileMaterial(e){const n=new Dt(this._lodPlanes[0],e);this._renderer.compile(n,gu)}_sceneToCubeUV(e,n,i,r){const a=new Rn(90,1,n,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,h=f.toneMapping;f.getClearColor(rm),f.toneMapping=nr,f.autoClear=!1;const p=new hc({name:"PMREM.Background",side:ln,depthWrite:!1,depthTest:!1}),g=new Dt(new zr,p);let x=!1;const m=e.background;m?m.isColor&&(p.color.copy(m),e.background=null,x=!0):(p.color.copy(rm),x=!0);for(let u=0;u<6;u++){const v=u%3;v===0?(a.up.set(0,l[u],0),a.lookAt(c[u],0,0)):v===1?(a.up.set(0,0,l[u]),a.lookAt(0,c[u],0)):(a.up.set(0,l[u],0),a.lookAt(0,0,c[u]));const _=this._cubeSize;$a(r,v*_,u>2?_:0,_,_),f.setRenderTarget(r),x&&f.render(g,a),f.render(e,a)}g.geometry.dispose(),g.material.dispose(),f.toneMapping=h,f.autoClear=d,e.background=m}_textureToCubeUV(e,n){const i=this._renderer,r=e.mapping===zs||e.mapping===Bs;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=cm()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=lm());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new Dt(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;$a(n,0,0,3*l,2*l),i.setRenderTarget(n),i.render(o,gu)}_applyPMREM(e){const n=this._renderer,i=n.autoClear;n.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=sm[(r-s-1)%sm.length];this._blur(e,s-1,s,o,a)}n.autoClear=i}_blur(e,n,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,n,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,n,i,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const f=3,d=new Dt(this._lodPlanes[r],c),h=c.uniforms,p=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*p):2*Math.PI/(2*Er-1),x=s/g,m=isFinite(s)?1+Math.floor(f*x):Er;m>Er&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Er}`);const u=[];let v=0;for(let A=0;A<Er;++A){const L=A/x,T=Math.exp(-L*L/2);u.push(T),A===0?v+=T:A<m&&(v+=2*T)}for(let A=0;A<u.length;A++)u[A]=u[A]/v;h.envMap.value=e.texture,h.samples.value=m,h.weights.value=u,h.latitudinal.value=o==="latitudinal",a&&(h.poleAxis.value=a);const{_lodMax:_}=this;h.dTheta.value=g,h.mipInt.value=_-i;const M=this._sizeLods[r],b=3*M*(r>_-Ss?r-_+Ss:0),C=4*(this._cubeSize-M);$a(n,b,C,3*M,2*M),l.setRenderTarget(n),l.render(d,gu)}}function jT(t){const e=[],n=[],i=[];let r=t;const s=t-Ss+1+im.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);n.push(a);let l=1/a;o>t-Ss?l=im[o-t+Ss-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),f=-c,d=1+c,h=[f,f,d,f,d,d,f,f,d,d,f,d],p=6,g=6,x=3,m=2,u=1,v=new Float32Array(x*g*p),_=new Float32Array(m*g*p),M=new Float32Array(u*g*p);for(let C=0;C<p;C++){const A=C%3*2/3-1,L=C>2?0:-1,T=[A,L,0,A+2/3,L,0,A+2/3,L+1,0,A,L,0,A+2/3,L+1,0,A,L+1,0];v.set(T,x*g*C),_.set(h,m*g*C);const S=[C,C,C,C,C,C];M.set(S,u*g*C)}const b=new Sn;b.setAttribute("position",new ri(v,x)),b.setAttribute("uv",new ri(_,m)),b.setAttribute("faceIndex",new ri(M,u)),e.push(b),r>Ss&&r--}return{lodPlanes:e,sizeLods:n,sigmas:i}}function am(t,e,n){const i=new $n(t,e,n);return i.texture.mapping=cc,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function $a(t,e,n,i,r){t.viewport.set(e,n,i,r),t.scissor.set(e,n,i,r)}function WT(t,e,n){const i=new Float32Array(Er),r=new F(0,1,0);return new Zt({name:"SphericalGaussianBlur",defines:{n:Er,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${t}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Uf(),fragmentShader:`

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
		`,blending:Si,depthTest:!1,depthWrite:!1})}function lm(){return new Zt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Uf(),fragmentShader:`

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
		`,blending:Si,depthTest:!1,depthWrite:!1})}function cm(){return new Zt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Uf(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Si,depthTest:!1,depthWrite:!1})}function Uf(){return`

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
	`}function XT(t){let e=new WeakMap,n=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===wd||l===Ad,f=l===zs||l===Bs;if(c||f){let d=e.get(a);const h=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==h)return n===null&&(n=new om(t)),d=c?n.fromEquirectangular(a,d):n.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),d.texture;if(d!==void 0)return d.texture;{const p=a.image;return c&&p&&p.height>0||f&&p&&r(p)?(n===null&&(n=new om(t)),d=c?n.fromEquirectangular(a):n.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),a.addEventListener("dispose",s),d.texture):null}}}return a}function r(a){let l=0;const c=6;for(let f=0;f<c;f++)a[f]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:o}}function $T(t){const e={};function n(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=t.getExtension("WEBGL_depth_texture")||t.getExtension("MOZ_WEBGL_depth_texture")||t.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=t.getExtension("EXT_texture_filter_anisotropic")||t.getExtension("MOZ_EXT_texture_filter_anisotropic")||t.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=t.getExtension("WEBGL_compressed_texture_s3tc")||t.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=t.getExtension("WEBGL_compressed_texture_pvrtc")||t.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=t.getExtension(i)}return e[i]=r,r}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){const r=n(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function YT(t,e,n,i){const r={},s=new WeakMap;function o(d){const h=d.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);for(const g in h.morphAttributes){const x=h.morphAttributes[g];for(let m=0,u=x.length;m<u;m++)e.remove(x[m])}h.removeEventListener("dispose",o),delete r[h.id];const p=s.get(h);p&&(e.remove(p),s.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,n.memory.geometries--}function a(d,h){return r[h.id]===!0||(h.addEventListener("dispose",o),r[h.id]=!0,n.memory.geometries++),h}function l(d){const h=d.attributes;for(const g in h)e.update(h[g],t.ARRAY_BUFFER);const p=d.morphAttributes;for(const g in p){const x=p[g];for(let m=0,u=x.length;m<u;m++)e.update(x[m],t.ARRAY_BUFFER)}}function c(d){const h=[],p=d.index,g=d.attributes.position;let x=0;if(p!==null){const v=p.array;x=p.version;for(let _=0,M=v.length;_<M;_+=3){const b=v[_+0],C=v[_+1],A=v[_+2];h.push(b,C,C,A,A,b)}}else if(g!==void 0){const v=g.array;x=g.version;for(let _=0,M=v.length/3-1;_<M;_+=3){const b=_+0,C=_+1,A=_+2;h.push(b,C,C,A,A,b)}}else return;const m=new(Hv(h)?Xv:Wv)(h,1);m.version=x;const u=s.get(d);u&&e.remove(u),s.set(d,m)}function f(d){const h=s.get(d);if(h){const p=d.index;p!==null&&h.version<p.version&&c(d)}else c(d);return s.get(d)}return{get:a,update:l,getWireframeAttribute:f}}function qT(t,e,n){let i;function r(h){i=h}let s,o;function a(h){s=h.type,o=h.bytesPerElement}function l(h,p){t.drawElements(i,p,s,h*o),n.update(p,i,1)}function c(h,p,g){g!==0&&(t.drawElementsInstanced(i,p,s,h*o,g),n.update(p,i,g))}function f(h,p,g){if(g===0)return;const x=e.get("WEBGL_multi_draw");if(x===null)for(let m=0;m<g;m++)this.render(h[m]/o,p[m]);else{x.multiDrawElementsWEBGL(i,p,0,s,h,0,g);let m=0;for(let u=0;u<g;u++)m+=p[u];n.update(m,i,1)}}function d(h,p,g,x){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let u=0;u<h.length;u++)c(h[u]/o,p[u],x[u]);else{m.multiDrawElementsInstancedWEBGL(i,p,0,s,h,0,x,0,g);let u=0;for(let v=0;v<g;v++)u+=p[v];for(let v=0;v<x.length;v++)n.update(u,i,x[v])}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=f,this.renderMultiDrawInstances=d}function KT(t){const e={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(n.calls++,o){case t.TRIANGLES:n.triangles+=a*(s/3);break;case t.LINES:n.lines+=a*(s/2);break;case t.LINE_STRIP:n.lines+=a*(s-1);break;case t.LINE_LOOP:n.lines+=a*s;break;case t.POINTS:n.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:e,render:n,programs:null,autoReset:!0,reset:r,update:i}}function ZT(t,e,n){const i=new WeakMap,r=new It;function s(o,a,l){const c=o.morphTargetInfluences,f=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=f!==void 0?f.length:0;let h=i.get(a);if(h===void 0||h.count!==d){let S=function(){L.dispose(),i.delete(a),a.removeEventListener("dispose",S)};var p=S;h!==void 0&&h.texture.dispose();const g=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,u=a.morphAttributes.position||[],v=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let M=0;g===!0&&(M=1),x===!0&&(M=2),m===!0&&(M=3);let b=a.attributes.position.count*M,C=1;b>e.maxTextureSize&&(C=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);const A=new Float32Array(b*C*4*d),L=new Gv(A,b,C,d);L.type=$i,L.needsUpdate=!0;const T=M*4;for(let U=0;U<d;U++){const k=u[U],D=v[U],V=_[U],z=b*C*4*U;for(let O=0;O<k.count;O++){const Z=O*T;g===!0&&(r.fromBufferAttribute(k,O),A[z+Z+0]=r.x,A[z+Z+1]=r.y,A[z+Z+2]=r.z,A[z+Z+3]=0),x===!0&&(r.fromBufferAttribute(D,O),A[z+Z+4]=r.x,A[z+Z+5]=r.y,A[z+Z+6]=r.z,A[z+Z+7]=0),m===!0&&(r.fromBufferAttribute(V,O),A[z+Z+8]=r.x,A[z+Z+9]=r.y,A[z+Z+10]=r.z,A[z+Z+11]=V.itemSize===4?r.w:1)}}h={count:d,texture:L,size:new ye(b,C)},i.set(a,h),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(t,"morphTexture",o.morphTexture,n);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const x=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(t,"morphTargetBaseInfluence",x),l.getUniforms().setValue(t,"morphTargetInfluences",c)}l.getUniforms().setValue(t,"morphTargetsTexture",h.texture,n),l.getUniforms().setValue(t,"morphTargetsTextureSize",h.size)}return{update:s}}function QT(t,e,n,i){let r=new WeakMap;function s(l){const c=i.render.frame,f=l.geometry,d=e.get(l,f);if(r.get(d)!==c&&(e.update(d),r.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(n.update(l.instanceMatrix,t.ARRAY_BUFFER),l.instanceColor!==null&&n.update(l.instanceColor,t.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const h=l.skeleton;r.get(h)!==c&&(h.update(),r.set(h,c))}return d}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),n.remove(c.instanceMatrix),c.instanceColor!==null&&n.remove(c.instanceColor)}return{update:s,dispose:o}}class Zv extends cn{constructor(e,n,i,r,s,o,a,l,c,f){if(f=f!==void 0?f:bs,f!==bs&&f!==Jo)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&f===bs&&(i=Hs),i===void 0&&f===Jo&&(i=aa),super(null,r,s,o,a,l,f,i,c),this.isDepthTexture=!0,this.image={width:e,height:n},this.magFilter=a!==void 0?a:Pn,this.minFilter=l!==void 0?l:Pn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const n=super.toJSON(e);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}}const Qv=new cn,Jv=new Zv(1,1);Jv.compareFunction=zv;const e_=new Gv,t_=new zM,n_=new qv,um=[],dm=[],fm=new Float32Array(16),hm=new Float32Array(9),pm=new Float32Array(4);function Ks(t,e,n){const i=t[0];if(i<=0||i>0)return t;const r=e*n;let s=um[r];if(s===void 0&&(s=new Float32Array(r),um[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=n,t[o].toArray(s,a)}return s}function Ct(t,e){if(t.length!==e.length)return!1;for(let n=0,i=t.length;n<i;n++)if(t[n]!==e[n])return!1;return!0}function Rt(t,e){for(let n=0,i=e.length;n<i;n++)t[n]=e[n]}function pc(t,e){let n=dm[e];n===void 0&&(n=new Int32Array(e),dm[e]=n);for(let i=0;i!==e;++i)n[i]=t.allocateTextureUnit();return n}function JT(t,e){const n=this.cache;n[0]!==e&&(t.uniform1f(this.addr,e),n[0]=e)}function ew(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2f(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Ct(n,e))return;t.uniform2fv(this.addr,e),Rt(n,e)}}function tw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3f(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else if(e.r!==void 0)(n[0]!==e.r||n[1]!==e.g||n[2]!==e.b)&&(t.uniform3f(this.addr,e.r,e.g,e.b),n[0]=e.r,n[1]=e.g,n[2]=e.b);else{if(Ct(n,e))return;t.uniform3fv(this.addr,e),Rt(n,e)}}function nw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4f(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Ct(n,e))return;t.uniform4fv(this.addr,e),Rt(n,e)}}function iw(t,e){const n=this.cache,i=e.elements;if(i===void 0){if(Ct(n,e))return;t.uniformMatrix2fv(this.addr,!1,e),Rt(n,e)}else{if(Ct(n,i))return;pm.set(i),t.uniformMatrix2fv(this.addr,!1,pm),Rt(n,i)}}function rw(t,e){const n=this.cache,i=e.elements;if(i===void 0){if(Ct(n,e))return;t.uniformMatrix3fv(this.addr,!1,e),Rt(n,e)}else{if(Ct(n,i))return;hm.set(i),t.uniformMatrix3fv(this.addr,!1,hm),Rt(n,i)}}function sw(t,e){const n=this.cache,i=e.elements;if(i===void 0){if(Ct(n,e))return;t.uniformMatrix4fv(this.addr,!1,e),Rt(n,e)}else{if(Ct(n,i))return;fm.set(i),t.uniformMatrix4fv(this.addr,!1,fm),Rt(n,i)}}function ow(t,e){const n=this.cache;n[0]!==e&&(t.uniform1i(this.addr,e),n[0]=e)}function aw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2i(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Ct(n,e))return;t.uniform2iv(this.addr,e),Rt(n,e)}}function lw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3i(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Ct(n,e))return;t.uniform3iv(this.addr,e),Rt(n,e)}}function cw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4i(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Ct(n,e))return;t.uniform4iv(this.addr,e),Rt(n,e)}}function uw(t,e){const n=this.cache;n[0]!==e&&(t.uniform1ui(this.addr,e),n[0]=e)}function dw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y)&&(t.uniform2ui(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y);else{if(Ct(n,e))return;t.uniform2uiv(this.addr,e),Rt(n,e)}}function fw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)&&(t.uniform3ui(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z);else{if(Ct(n,e))return;t.uniform3uiv(this.addr,e),Rt(n,e)}}function hw(t,e){const n=this.cache;if(e.x!==void 0)(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)&&(t.uniform4ui(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w);else{if(Ct(n,e))return;t.uniform4uiv(this.addr,e),Rt(n,e)}}function pw(t,e,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r);const s=this.type===t.SAMPLER_2D_SHADOW?Jv:Qv;n.setTexture2D(e||s,r)}function mw(t,e,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture3D(e||t_,r)}function gw(t,e,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTextureCube(e||n_,r)}function vw(t,e,n){const i=this.cache,r=n.allocateTextureUnit();i[0]!==r&&(t.uniform1i(this.addr,r),i[0]=r),n.setTexture2DArray(e||e_,r)}function _w(t){switch(t){case 5126:return JT;case 35664:return ew;case 35665:return tw;case 35666:return nw;case 35674:return iw;case 35675:return rw;case 35676:return sw;case 5124:case 35670:return ow;case 35667:case 35671:return aw;case 35668:case 35672:return lw;case 35669:case 35673:return cw;case 5125:return uw;case 36294:return dw;case 36295:return fw;case 36296:return hw;case 35678:case 36198:case 36298:case 36306:case 35682:return pw;case 35679:case 36299:case 36307:return mw;case 35680:case 36300:case 36308:case 36293:return gw;case 36289:case 36303:case 36311:case 36292:return vw}}function xw(t,e){t.uniform1fv(this.addr,e)}function yw(t,e){const n=Ks(e,this.size,2);t.uniform2fv(this.addr,n)}function Sw(t,e){const n=Ks(e,this.size,3);t.uniform3fv(this.addr,n)}function Mw(t,e){const n=Ks(e,this.size,4);t.uniform4fv(this.addr,n)}function Ew(t,e){const n=Ks(e,this.size,4);t.uniformMatrix2fv(this.addr,!1,n)}function Tw(t,e){const n=Ks(e,this.size,9);t.uniformMatrix3fv(this.addr,!1,n)}function ww(t,e){const n=Ks(e,this.size,16);t.uniformMatrix4fv(this.addr,!1,n)}function Aw(t,e){t.uniform1iv(this.addr,e)}function Cw(t,e){t.uniform2iv(this.addr,e)}function Rw(t,e){t.uniform3iv(this.addr,e)}function bw(t,e){t.uniform4iv(this.addr,e)}function Pw(t,e){t.uniform1uiv(this.addr,e)}function Lw(t,e){t.uniform2uiv(this.addr,e)}function Nw(t,e){t.uniform3uiv(this.addr,e)}function Dw(t,e){t.uniform4uiv(this.addr,e)}function Iw(t,e,n){const i=this.cache,r=e.length,s=pc(n,r);Ct(i,s)||(t.uniform1iv(this.addr,s),Rt(i,s));for(let o=0;o!==r;++o)n.setTexture2D(e[o]||Qv,s[o])}function Uw(t,e,n){const i=this.cache,r=e.length,s=pc(n,r);Ct(i,s)||(t.uniform1iv(this.addr,s),Rt(i,s));for(let o=0;o!==r;++o)n.setTexture3D(e[o]||t_,s[o])}function Fw(t,e,n){const i=this.cache,r=e.length,s=pc(n,r);Ct(i,s)||(t.uniform1iv(this.addr,s),Rt(i,s));for(let o=0;o!==r;++o)n.setTextureCube(e[o]||n_,s[o])}function Ow(t,e,n){const i=this.cache,r=e.length,s=pc(n,r);Ct(i,s)||(t.uniform1iv(this.addr,s),Rt(i,s));for(let o=0;o!==r;++o)n.setTexture2DArray(e[o]||e_,s[o])}function kw(t){switch(t){case 5126:return xw;case 35664:return yw;case 35665:return Sw;case 35666:return Mw;case 35674:return Ew;case 35675:return Tw;case 35676:return ww;case 5124:case 35670:return Aw;case 35667:case 35671:return Cw;case 35668:case 35672:return Rw;case 35669:case 35673:return bw;case 5125:return Pw;case 36294:return Lw;case 36295:return Nw;case 36296:return Dw;case 35678:case 36198:case 36298:case 36306:case 35682:return Iw;case 35679:case 36299:case 36307:return Uw;case 35680:case 36300:case 36308:case 36293:return Fw;case 36289:case 36303:case 36311:case 36292:return Ow}}class zw{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.setValue=_w(n.type)}}class Bw{constructor(e,n,i){this.id=e,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=kw(n.type)}}class Hw{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,n,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,n[a.id],i)}}}const Su=/(\w+)(\])?(\[|\.)?/g;function mm(t,e){t.seq.push(e),t.map[e.id]=e}function Vw(t,e,n){const i=t.name,r=i.length;for(Su.lastIndex=0;;){const s=Su.exec(i),o=Su.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){mm(n,c===void 0?new zw(a,t,e):new Bw(a,t,e));break}else{let d=n.map[a];d===void 0&&(d=new Hw(a),mm(n,d)),n=d}}}class dl{constructor(e,n){this.seq=[],this.map={};const i=e.getProgramParameter(n,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(n,r),o=e.getUniformLocation(n,s.name);Vw(s,o,this)}}setValue(e,n,i,r){const s=this.map[n];s!==void 0&&s.setValue(e,i,r)}setOptional(e,n,i){const r=n[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,n,i,r){for(let s=0,o=n.length;s!==o;++s){const a=n[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,n){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in n&&i.push(o)}return i}}function gm(t,e,n){const i=t.createShader(e);return t.shaderSource(i,n),t.compileShader(i),i}const Gw=37297;let jw=0;function Ww(t,e){const n=t.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,n.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${n[o]}`)}return i.join(`
`)}function Xw(t){const e=tt.getPrimaries(tt.workingColorSpace),n=tt.getPrimaries(t);let i;switch(e===n?i="":e===Bl&&n===zl?i="LinearDisplayP3ToLinearSRGB":e===zl&&n===Bl&&(i="LinearSRGBToLinearDisplayP3"),t){case dr:case uc:return[i,"LinearTransferOETF"];case Vn:case Pf:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",t),[i,"LinearTransferOETF"]}}function vm(t,e,n){const i=t.getShaderParameter(e,t.COMPILE_STATUS),r=t.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return n.toUpperCase()+`

`+r+`

`+Ww(t.getShaderSource(e),o)}else return r}function $w(t,e){const n=Xw(e);return`vec4 ${t}( vec4 value ) { return ${n[0]}( ${n[1]}( value ) ); }`}function Yw(t,e){let n;switch(e){case wv:n="Linear";break;case Av:n="Reinhard";break;case Cv:n="OptimizedCineon";break;case bf:n="ACESFilmic";break;case Rv:n="AgX";break;case bv:n="Neutral";break;case YS:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),n="Linear"}return"vec3 "+t+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}function qw(t){return[t.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",t.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Mo).join(`
`)}function Kw(t){const e=[];for(const n in t){const i=t[n];i!==!1&&e.push("#define "+n+" "+i)}return e.join(`
`)}function Zw(t,e){const n={},i=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=t.getActiveAttrib(e,r),o=s.name;let a=1;s.type===t.FLOAT_MAT2&&(a=2),s.type===t.FLOAT_MAT3&&(a=3),s.type===t.FLOAT_MAT4&&(a=4),n[o]={type:s.type,location:t.getAttribLocation(e,o),locationSize:a}}return n}function Mo(t){return t!==""}function _m(t,e){const n=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return t.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function xm(t,e){return t.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Qw=/^[ \t]*#include +<([\w\d./]+)>/gm;function bd(t){return t.replace(Qw,eA)}const Jw=new Map;function eA(t,e){let n=ze[e];if(n===void 0){const i=Jw.get(e);if(i!==void 0)n=ze[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return bd(n)}const tA=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ym(t){return t.replace(tA,nA)}function nA(t,e,n,i){let r="";for(let s=parseInt(e);s<parseInt(n);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Sm(t){let e=`precision ${t.precision} float;
	precision ${t.precision} int;
	precision ${t.precision} sampler2D;
	precision ${t.precision} samplerCube;
	precision ${t.precision} sampler3D;
	precision ${t.precision} sampler2DArray;
	precision ${t.precision} sampler2DShadow;
	precision ${t.precision} samplerCubeShadow;
	precision ${t.precision} sampler2DArrayShadow;
	precision ${t.precision} isampler2D;
	precision ${t.precision} isampler3D;
	precision ${t.precision} isamplerCube;
	precision ${t.precision} isampler2DArray;
	precision ${t.precision} usampler2D;
	precision ${t.precision} usampler3D;
	precision ${t.precision} usamplerCube;
	precision ${t.precision} usampler2DArray;
	`;return t.precision==="highp"?e+=`
#define HIGH_PRECISION`:t.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:t.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function iA(t){let e="SHADOWMAP_TYPE_BASIC";return t.shadowMapType===Mv?e="SHADOWMAP_TYPE_PCF":t.shadowMapType===Ev?e="SHADOWMAP_TYPE_PCF_SOFT":t.shadowMapType===pi&&(e="SHADOWMAP_TYPE_VSM"),e}function rA(t){let e="ENVMAP_TYPE_CUBE";if(t.envMap)switch(t.envMapMode){case zs:case Bs:e="ENVMAP_TYPE_CUBE";break;case cc:e="ENVMAP_TYPE_CUBE_UV";break}return e}function sA(t){let e="ENVMAP_MODE_REFLECTION";if(t.envMap)switch(t.envMapMode){case Bs:e="ENVMAP_MODE_REFRACTION";break}return e}function oA(t){let e="ENVMAP_BLENDING_NONE";if(t.envMap)switch(t.combine){case Tv:e="ENVMAP_BLENDING_MULTIPLY";break;case XS:e="ENVMAP_BLENDING_MIX";break;case $S:e="ENVMAP_BLENDING_ADD";break}return e}function aA(t){const e=t.envMapCubeUVHeight;if(e===null)return null;const n=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,n),7*16)),texelHeight:i,maxMip:n}}function lA(t,e,n,i){const r=t.getContext(),s=n.defines;let o=n.vertexShader,a=n.fragmentShader;const l=iA(n),c=rA(n),f=sA(n),d=oA(n),h=aA(n),p=qw(n),g=Kw(s),x=r.createProgram();let m,u,v=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(m=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g].filter(Mo).join(`
`),m.length>0&&(m+=`
`),u=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g].filter(Mo).join(`
`),u.length>0&&(u+=`
`)):(m=[Sm(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+f:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.useLegacyLights?"#define LEGACY_LIGHTS":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Mo).join(`
`),u=[Sm(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,g,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+c:"",n.envMap?"#define "+f:"",n.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.useLegacyLights?"#define LEGACY_LIGHTS":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==nr?"#define TONE_MAPPING":"",n.toneMapping!==nr?ze.tonemapping_pars_fragment:"",n.toneMapping!==nr?Yw("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",ze.colorspace_pars_fragment,$w("linearToOutputTexel",n.outputColorSpace),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(Mo).join(`
`)),o=bd(o),o=_m(o,n),o=xm(o,n),a=bd(a),a=_m(a,n),a=xm(a,n),o=ym(o),a=ym(a),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,u=["#define varying in",n.glslVersion===Fp?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===Fp?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);const _=v+m+o,M=v+u+a,b=gm(r,r.VERTEX_SHADER,_),C=gm(r,r.FRAGMENT_SHADER,M);r.attachShader(x,b),r.attachShader(x,C),n.index0AttributeName!==void 0?r.bindAttribLocation(x,0,n.index0AttributeName):n.morphTargets===!0&&r.bindAttribLocation(x,0,"position"),r.linkProgram(x);function A(U){if(t.debug.checkShaderErrors){const k=r.getProgramInfoLog(x).trim(),D=r.getShaderInfoLog(b).trim(),V=r.getShaderInfoLog(C).trim();let z=!0,O=!0;if(r.getProgramParameter(x,r.LINK_STATUS)===!1)if(z=!1,typeof t.debug.onShaderError=="function")t.debug.onShaderError(r,x,b,C);else{const Z=vm(r,b,"vertex"),I=vm(r,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(x,r.VALIDATE_STATUS)+`

Material Name: `+U.name+`
Material Type: `+U.type+`

Program Info Log: `+k+`
`+Z+`
`+I)}else k!==""?console.warn("THREE.WebGLProgram: Program Info Log:",k):(D===""||V==="")&&(O=!1);O&&(U.diagnostics={runnable:z,programLog:k,vertexShader:{log:D,prefix:m},fragmentShader:{log:V,prefix:u}})}r.deleteShader(b),r.deleteShader(C),L=new dl(r,x),T=Zw(r,x)}let L;this.getUniforms=function(){return L===void 0&&A(this),L};let T;this.getAttributes=function(){return T===void 0&&A(this),T};let S=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(x,Gw)),S},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(x),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=jw++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=b,this.fragmentShader=C,this}let cA=0;class uA{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const n=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(n),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const n=this.materialCache.get(e);for(const i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const n=this.materialCache;let i=n.get(e);return i===void 0&&(i=new Set,n.set(e,i)),i}_getShaderStage(e){const n=this.shaderCache;let i=n.get(e);return i===void 0&&(i=new dA(e),n.set(e,i)),i}}class dA{constructor(e){this.id=cA++,this.code=e,this.usedTimes=0}}function fA(t,e,n,i,r,s,o){const a=new Nf,l=new uA,c=new Set,f=[],d=r.logarithmicDepthBuffer,h=r.vertexTextures;let p=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(T){return c.add(T),T===0?"uv":`uv${T}`}function m(T,S,U,k,D){const V=k.fog,z=D.geometry,O=T.isMeshStandardMaterial?k.environment:null,Z=(T.isMeshStandardMaterial?n:e).get(T.envMap||O),I=Z&&Z.mapping===cc?Z.image.height:null,G=g[T.type];T.precision!==null&&(p=r.getMaxPrecision(T.precision),p!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",p,"instead."));const X=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,ee=X!==void 0?X.length:0;let ue=0;z.morphAttributes.position!==void 0&&(ue=1),z.morphAttributes.normal!==void 0&&(ue=2),z.morphAttributes.color!==void 0&&(ue=3);let be,K,ne,he;if(G){const Ze=Zn[G];be=Ze.vertexShader,K=Ze.fragmentShader}else be=T.vertexShader,K=T.fragmentShader,l.update(T),ne=l.getVertexShaderID(T),he=l.getFragmentShaderID(T);const ae=t.getRenderTarget(),He=D.isInstancedMesh===!0,Ne=D.isBatchedMesh===!0,N=!!T.map,xe=!!T.matcap,oe=!!Z,Ve=!!T.aoMap,ge=!!T.lightMap,we=!!T.bumpMap,Ce=!!T.normalMap,Pe=!!T.displacementMap,et=!!T.emissiveMap,P=!!T.metalnessMap,w=!!T.roughnessMap,j=T.anisotropy>0,Q=T.clearcoat>0,ie=T.dispersion>0,re=T.iridescence>0,Te=T.sheen>0,pe=T.transmission>0,fe=j&&!!T.anisotropyMap,Le=Q&&!!T.clearcoatMap,ce=Q&&!!T.clearcoatNormalMap,Ee=Q&&!!T.clearcoatRoughnessMap,Ye=re&&!!T.iridescenceMap,Ae=re&&!!T.iridescenceThicknessMap,_e=Te&&!!T.sheenColorMap,Ue=Te&&!!T.sheenRoughnessMap,je=!!T.specularMap,it=!!T.specularColorMap,Oe=!!T.specularIntensityMap,E=pe&&!!T.transmissionMap,B=pe&&!!T.thicknessMap,W=!!T.gradientMap,te=!!T.alphaMap,le=T.alphaTest>0,Fe=!!T.alphaHash,We=!!T.extensions;let ft=nr;T.toneMapped&&(ae===null||ae.isXRRenderTarget===!0)&&(ft=t.toneMapping);const bt={shaderID:G,shaderType:T.type,shaderName:T.name,vertexShader:be,fragmentShader:K,defines:T.defines,customVertexShaderID:ne,customFragmentShaderID:he,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:p,batching:Ne,instancing:He,instancingColor:He&&D.instanceColor!==null,instancingMorph:He&&D.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:ae===null?t.outputColorSpace:ae.isXRRenderTarget===!0?ae.texture.colorSpace:dr,alphaToCoverage:!!T.alphaToCoverage,map:N,matcap:xe,envMap:oe,envMapMode:oe&&Z.mapping,envMapCubeUVHeight:I,aoMap:Ve,lightMap:ge,bumpMap:we,normalMap:Ce,displacementMap:h&&Pe,emissiveMap:et,normalMapObjectSpace:Ce&&T.normalMapType===lM,normalMapTangentSpace:Ce&&T.normalMapType===kv,metalnessMap:P,roughnessMap:w,anisotropy:j,anisotropyMap:fe,clearcoat:Q,clearcoatMap:Le,clearcoatNormalMap:ce,clearcoatRoughnessMap:Ee,dispersion:ie,iridescence:re,iridescenceMap:Ye,iridescenceThicknessMap:Ae,sheen:Te,sheenColorMap:_e,sheenRoughnessMap:Ue,specularMap:je,specularColorMap:it,specularIntensityMap:Oe,transmission:pe,transmissionMap:E,thicknessMap:B,gradientMap:W,opaque:T.transparent===!1&&T.blending===Rs&&T.alphaToCoverage===!1,alphaMap:te,alphaTest:le,alphaHash:Fe,combine:T.combine,mapUv:N&&x(T.map.channel),aoMapUv:Ve&&x(T.aoMap.channel),lightMapUv:ge&&x(T.lightMap.channel),bumpMapUv:we&&x(T.bumpMap.channel),normalMapUv:Ce&&x(T.normalMap.channel),displacementMapUv:Pe&&x(T.displacementMap.channel),emissiveMapUv:et&&x(T.emissiveMap.channel),metalnessMapUv:P&&x(T.metalnessMap.channel),roughnessMapUv:w&&x(T.roughnessMap.channel),anisotropyMapUv:fe&&x(T.anisotropyMap.channel),clearcoatMapUv:Le&&x(T.clearcoatMap.channel),clearcoatNormalMapUv:ce&&x(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ee&&x(T.clearcoatRoughnessMap.channel),iridescenceMapUv:Ye&&x(T.iridescenceMap.channel),iridescenceThicknessMapUv:Ae&&x(T.iridescenceThicknessMap.channel),sheenColorMapUv:_e&&x(T.sheenColorMap.channel),sheenRoughnessMapUv:Ue&&x(T.sheenRoughnessMap.channel),specularMapUv:je&&x(T.specularMap.channel),specularColorMapUv:it&&x(T.specularColorMap.channel),specularIntensityMapUv:Oe&&x(T.specularIntensityMap.channel),transmissionMapUv:E&&x(T.transmissionMap.channel),thicknessMapUv:B&&x(T.thicknessMap.channel),alphaMapUv:te&&x(T.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(Ce||j),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!z.attributes.uv&&(N||te),fog:!!V,useFog:T.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:T.flatShading===!0,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:D.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:ee,morphTextureStride:ue,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:t.shadowMap.enabled&&U.length>0,shadowMapType:t.shadowMap.type,toneMapping:ft,useLegacyLights:t._useLegacyLights,decodeVideoTexture:N&&T.map.isVideoTexture===!0&&tt.getTransfer(T.map.colorSpace)===rt,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===Jn,flipSided:T.side===ln,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:We&&T.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:We&&T.extensions.multiDraw===!0&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return bt.vertexUv1s=c.has(1),bt.vertexUv2s=c.has(2),bt.vertexUv3s=c.has(3),c.clear(),bt}function u(T){const S=[];if(T.shaderID?S.push(T.shaderID):(S.push(T.customVertexShaderID),S.push(T.customFragmentShaderID)),T.defines!==void 0)for(const U in T.defines)S.push(U),S.push(T.defines[U]);return T.isRawShaderMaterial===!1&&(v(S,T),_(S,T),S.push(t.outputColorSpace)),S.push(T.customProgramCacheKey),S.join()}function v(T,S){T.push(S.precision),T.push(S.outputColorSpace),T.push(S.envMapMode),T.push(S.envMapCubeUVHeight),T.push(S.mapUv),T.push(S.alphaMapUv),T.push(S.lightMapUv),T.push(S.aoMapUv),T.push(S.bumpMapUv),T.push(S.normalMapUv),T.push(S.displacementMapUv),T.push(S.emissiveMapUv),T.push(S.metalnessMapUv),T.push(S.roughnessMapUv),T.push(S.anisotropyMapUv),T.push(S.clearcoatMapUv),T.push(S.clearcoatNormalMapUv),T.push(S.clearcoatRoughnessMapUv),T.push(S.iridescenceMapUv),T.push(S.iridescenceThicknessMapUv),T.push(S.sheenColorMapUv),T.push(S.sheenRoughnessMapUv),T.push(S.specularMapUv),T.push(S.specularColorMapUv),T.push(S.specularIntensityMapUv),T.push(S.transmissionMapUv),T.push(S.thicknessMapUv),T.push(S.combine),T.push(S.fogExp2),T.push(S.sizeAttenuation),T.push(S.morphTargetsCount),T.push(S.morphAttributeCount),T.push(S.numDirLights),T.push(S.numPointLights),T.push(S.numSpotLights),T.push(S.numSpotLightMaps),T.push(S.numHemiLights),T.push(S.numRectAreaLights),T.push(S.numDirLightShadows),T.push(S.numPointLightShadows),T.push(S.numSpotLightShadows),T.push(S.numSpotLightShadowsWithMaps),T.push(S.numLightProbes),T.push(S.shadowMapType),T.push(S.toneMapping),T.push(S.numClippingPlanes),T.push(S.numClipIntersection),T.push(S.depthPacking)}function _(T,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),T.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.skinning&&a.enable(4),S.morphTargets&&a.enable(5),S.morphNormals&&a.enable(6),S.morphColors&&a.enable(7),S.premultipliedAlpha&&a.enable(8),S.shadowMapEnabled&&a.enable(9),S.useLegacyLights&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.alphaToCoverage&&a.enable(20),T.push(a.mask)}function M(T){const S=g[T.type];let U;if(S){const k=Zn[S];U=ta.clone(k.uniforms)}else U=T.uniforms;return U}function b(T,S){let U;for(let k=0,D=f.length;k<D;k++){const V=f[k];if(V.cacheKey===S){U=V,++U.usedTimes;break}}return U===void 0&&(U=new lA(t,S,T,s),f.push(U)),U}function C(T){if(--T.usedTimes===0){const S=f.indexOf(T);f[S]=f[f.length-1],f.pop(),T.destroy()}}function A(T){l.remove(T)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:u,getUniforms:M,acquireProgram:b,releaseProgram:C,releaseShaderCache:A,programs:f,dispose:L}}function hA(){let t=new WeakMap;function e(s){let o=t.get(s);return o===void 0&&(o={},t.set(s,o)),o}function n(s){t.delete(s)}function i(s,o,a){t.get(s)[o]=a}function r(){t=new WeakMap}return{get:e,remove:n,update:i,dispose:r}}function pA(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.material.id!==e.material.id?t.material.id-e.material.id:t.z!==e.z?t.z-e.z:t.id-e.id}function Mm(t,e){return t.groupOrder!==e.groupOrder?t.groupOrder-e.groupOrder:t.renderOrder!==e.renderOrder?t.renderOrder-e.renderOrder:t.z!==e.z?e.z-t.z:t.id-e.id}function Em(){const t=[];let e=0;const n=[],i=[],r=[];function s(){e=0,n.length=0,i.length=0,r.length=0}function o(d,h,p,g,x,m){let u=t[e];return u===void 0?(u={id:d.id,object:d,geometry:h,material:p,groupOrder:g,renderOrder:d.renderOrder,z:x,group:m},t[e]=u):(u.id=d.id,u.object=d,u.geometry=h,u.material=p,u.groupOrder=g,u.renderOrder=d.renderOrder,u.z=x,u.group=m),e++,u}function a(d,h,p,g,x,m){const u=o(d,h,p,g,x,m);p.transmission>0?i.push(u):p.transparent===!0?r.push(u):n.push(u)}function l(d,h,p,g,x,m){const u=o(d,h,p,g,x,m);p.transmission>0?i.unshift(u):p.transparent===!0?r.unshift(u):n.unshift(u)}function c(d,h){n.length>1&&n.sort(d||pA),i.length>1&&i.sort(h||Mm),r.length>1&&r.sort(h||Mm)}function f(){for(let d=e,h=t.length;d<h;d++){const p=t[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:n,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:f,sort:c}}function mA(){let t=new WeakMap;function e(i,r){const s=t.get(i);let o;return s===void 0?(o=new Em,t.set(i,[o])):r>=s.length?(o=new Em,s.push(o)):o=s[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}function gA(){const t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={direction:new F,color:new Ge};break;case"SpotLight":n={position:new F,direction:new F,color:new Ge,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new F,color:new Ge,distance:0,decay:0};break;case"HemisphereLight":n={direction:new F,skyColor:new Ge,groundColor:new Ge};break;case"RectAreaLight":n={color:new Ge,position:new F,halfWidth:new F,halfHeight:new F};break}return t[e.id]=n,n}}}function vA(){const t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"DirectionalLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ye};break;case"SpotLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ye};break;case"PointLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ye,shadowCameraNear:1,shadowCameraFar:1e3};break}return t[e.id]=n,n}}}let _A=0;function xA(t,e){return(e.castShadow?2:0)-(t.castShadow?2:0)+(e.map?1:0)-(t.map?1:0)}function yA(t){const e=new gA,n=vA(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new F);const r=new F,s=new ot,o=new ot;function a(c,f){let d=0,h=0,p=0;for(let U=0;U<9;U++)i.probe[U].set(0,0,0);let g=0,x=0,m=0,u=0,v=0,_=0,M=0,b=0,C=0,A=0,L=0;c.sort(xA);const T=f===!0?Math.PI:1;for(let U=0,k=c.length;U<k;U++){const D=c[U],V=D.color,z=D.intensity,O=D.distance,Z=D.shadow&&D.shadow.map?D.shadow.map.texture:null;if(D.isAmbientLight)d+=V.r*z*T,h+=V.g*z*T,p+=V.b*z*T;else if(D.isLightProbe){for(let I=0;I<9;I++)i.probe[I].addScaledVector(D.sh.coefficients[I],z);L++}else if(D.isDirectionalLight){const I=e.get(D);if(I.color.copy(D.color).multiplyScalar(D.intensity*T),D.castShadow){const G=D.shadow,X=n.get(D);X.shadowBias=G.bias,X.shadowNormalBias=G.normalBias,X.shadowRadius=G.radius,X.shadowMapSize=G.mapSize,i.directionalShadow[g]=X,i.directionalShadowMap[g]=Z,i.directionalShadowMatrix[g]=D.shadow.matrix,_++}i.directional[g]=I,g++}else if(D.isSpotLight){const I=e.get(D);I.position.setFromMatrixPosition(D.matrixWorld),I.color.copy(V).multiplyScalar(z*T),I.distance=O,I.coneCos=Math.cos(D.angle),I.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),I.decay=D.decay,i.spot[m]=I;const G=D.shadow;if(D.map&&(i.spotLightMap[C]=D.map,C++,G.updateMatrices(D),D.castShadow&&A++),i.spotLightMatrix[m]=G.matrix,D.castShadow){const X=n.get(D);X.shadowBias=G.bias,X.shadowNormalBias=G.normalBias,X.shadowRadius=G.radius,X.shadowMapSize=G.mapSize,i.spotShadow[m]=X,i.spotShadowMap[m]=Z,b++}m++}else if(D.isRectAreaLight){const I=e.get(D);I.color.copy(V).multiplyScalar(z),I.halfWidth.set(D.width*.5,0,0),I.halfHeight.set(0,D.height*.5,0),i.rectArea[u]=I,u++}else if(D.isPointLight){const I=e.get(D);if(I.color.copy(D.color).multiplyScalar(D.intensity*T),I.distance=D.distance,I.decay=D.decay,D.castShadow){const G=D.shadow,X=n.get(D);X.shadowBias=G.bias,X.shadowNormalBias=G.normalBias,X.shadowRadius=G.radius,X.shadowMapSize=G.mapSize,X.shadowCameraNear=G.camera.near,X.shadowCameraFar=G.camera.far,i.pointShadow[x]=X,i.pointShadowMap[x]=Z,i.pointShadowMatrix[x]=D.shadow.matrix,M++}i.point[x]=I,x++}else if(D.isHemisphereLight){const I=e.get(D);I.skyColor.copy(D.color).multiplyScalar(z*T),I.groundColor.copy(D.groundColor).multiplyScalar(z*T),i.hemi[v]=I,v++}}u>0&&(t.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=de.LTC_FLOAT_1,i.rectAreaLTC2=de.LTC_FLOAT_2):(i.rectAreaLTC1=de.LTC_HALF_1,i.rectAreaLTC2=de.LTC_HALF_2)),i.ambient[0]=d,i.ambient[1]=h,i.ambient[2]=p;const S=i.hash;(S.directionalLength!==g||S.pointLength!==x||S.spotLength!==m||S.rectAreaLength!==u||S.hemiLength!==v||S.numDirectionalShadows!==_||S.numPointShadows!==M||S.numSpotShadows!==b||S.numSpotMaps!==C||S.numLightProbes!==L)&&(i.directional.length=g,i.spot.length=m,i.rectArea.length=u,i.point.length=x,i.hemi.length=v,i.directionalShadow.length=_,i.directionalShadowMap.length=_,i.pointShadow.length=M,i.pointShadowMap.length=M,i.spotShadow.length=b,i.spotShadowMap.length=b,i.directionalShadowMatrix.length=_,i.pointShadowMatrix.length=M,i.spotLightMatrix.length=b+C-A,i.spotLightMap.length=C,i.numSpotLightShadowsWithMaps=A,i.numLightProbes=L,S.directionalLength=g,S.pointLength=x,S.spotLength=m,S.rectAreaLength=u,S.hemiLength=v,S.numDirectionalShadows=_,S.numPointShadows=M,S.numSpotShadows=b,S.numSpotMaps=C,S.numLightProbes=L,i.version=_A++)}function l(c,f){let d=0,h=0,p=0,g=0,x=0;const m=f.matrixWorldInverse;for(let u=0,v=c.length;u<v;u++){const _=c[u];if(_.isDirectionalLight){const M=i.directional[d];M.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),d++}else if(_.isSpotLight){const M=i.spot[p];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),p++}else if(_.isRectAreaLight){const M=i.rectArea[g];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),o.identity(),s.copy(_.matrixWorld),s.premultiply(m),o.extractRotation(s),M.halfWidth.set(_.width*.5,0,0),M.halfHeight.set(0,_.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const M=i.point[h];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),h++}else if(_.isHemisphereLight){const M=i.hemi[x];M.direction.setFromMatrixPosition(_.matrixWorld),M.direction.transformDirection(m),x++}}}return{setup:a,setupView:l,state:i}}function Tm(t){const e=new yA(t),n=[],i=[];function r(f){c.camera=f,n.length=0,i.length=0}function s(f){n.push(f)}function o(f){i.push(f)}function a(f){e.setup(n,f)}function l(f){e.setupView(n,f)}const c={lightsArray:n,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function SA(t){let e=new WeakMap;function n(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new Tm(t),e.set(r,[a])):s>=o.length?(a=new Tm(t),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:n,dispose:i}}class MA extends Ys{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=oM,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class EA extends Ys{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const TA=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wA=`uniform sampler2D shadow_pass;
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
}`;function AA(t,e,n){let i=new Df;const r=new ye,s=new ye,o=new It,a=new MA({depthPacking:aM}),l=new EA,c={},f=n.maxTextureSize,d={[or]:ln,[ln]:or,[Jn]:Jn},h=new Zt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ye},radius:{value:4}},vertexShader:TA,fragmentShader:wA}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const g=new Sn;g.setAttribute("position",new ri(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Dt(g,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Mv;let u=this.type;this.render=function(C,A,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||C.length===0)return;const T=t.getRenderTarget(),S=t.getActiveCubeFace(),U=t.getActiveMipmapLevel(),k=t.state;k.setBlending(Si),k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);const D=u!==pi&&this.type===pi,V=u===pi&&this.type!==pi;for(let z=0,O=C.length;z<O;z++){const Z=C[z],I=Z.shadow;if(I===void 0){console.warn("THREE.WebGLShadowMap:",Z,"has no shadow.");continue}if(I.autoUpdate===!1&&I.needsUpdate===!1)continue;r.copy(I.mapSize);const G=I.getFrameExtents();if(r.multiply(G),s.copy(I.mapSize),(r.x>f||r.y>f)&&(r.x>f&&(s.x=Math.floor(f/G.x),r.x=s.x*G.x,I.mapSize.x=s.x),r.y>f&&(s.y=Math.floor(f/G.y),r.y=s.y*G.y,I.mapSize.y=s.y)),I.map===null||D===!0||V===!0){const ee=this.type!==pi?{minFilter:Pn,magFilter:Pn}:{};I.map!==null&&I.map.dispose(),I.map=new $n(r.x,r.y,ee),I.map.texture.name=Z.name+".shadowMap",I.camera.updateProjectionMatrix()}t.setRenderTarget(I.map),t.clear();const X=I.getViewportCount();for(let ee=0;ee<X;ee++){const ue=I.getViewport(ee);o.set(s.x*ue.x,s.y*ue.y,s.x*ue.z,s.y*ue.w),k.viewport(o),I.updateMatrices(Z,ee),i=I.getFrustum(),M(A,L,I.camera,Z,this.type)}I.isPointLightShadow!==!0&&this.type===pi&&v(I,L),I.needsUpdate=!1}u=this.type,m.needsUpdate=!1,t.setRenderTarget(T,S,U)};function v(C,A){const L=e.update(x);h.defines.VSM_SAMPLES!==C.blurSamples&&(h.defines.VSM_SAMPLES=C.blurSamples,p.defines.VSM_SAMPLES=C.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new $n(r.x,r.y)),h.uniforms.shadow_pass.value=C.map.texture,h.uniforms.resolution.value=C.mapSize,h.uniforms.radius.value=C.radius,t.setRenderTarget(C.mapPass),t.clear(),t.renderBufferDirect(A,null,L,h,x,null),p.uniforms.shadow_pass.value=C.mapPass.texture,p.uniforms.resolution.value=C.mapSize,p.uniforms.radius.value=C.radius,t.setRenderTarget(C.map),t.clear(),t.renderBufferDirect(A,null,L,p,x,null)}function _(C,A,L,T){let S=null;const U=L.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(U!==void 0)S=U;else if(S=L.isPointLight===!0?l:a,t.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const k=S.uuid,D=A.uuid;let V=c[k];V===void 0&&(V={},c[k]=V);let z=V[D];z===void 0&&(z=S.clone(),V[D]=z,A.addEventListener("dispose",b)),S=z}if(S.visible=A.visible,S.wireframe=A.wireframe,T===pi?S.side=A.shadowSide!==null?A.shadowSide:A.side:S.side=A.shadowSide!==null?A.shadowSide:d[A.side],S.alphaMap=A.alphaMap,S.alphaTest=A.alphaTest,S.map=A.map,S.clipShadows=A.clipShadows,S.clippingPlanes=A.clippingPlanes,S.clipIntersection=A.clipIntersection,S.displacementMap=A.displacementMap,S.displacementScale=A.displacementScale,S.displacementBias=A.displacementBias,S.wireframeLinewidth=A.wireframeLinewidth,S.linewidth=A.linewidth,L.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const k=t.properties.get(S);k.light=L}return S}function M(C,A,L,T,S){if(C.visible===!1)return;if(C.layers.test(A.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&S===pi)&&(!C.frustumCulled||i.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,C.matrixWorld);const D=e.update(C),V=C.material;if(Array.isArray(V)){const z=D.groups;for(let O=0,Z=z.length;O<Z;O++){const I=z[O],G=V[I.materialIndex];if(G&&G.visible){const X=_(C,G,T,S);C.onBeforeShadow(t,C,A,L,D,X,I),t.renderBufferDirect(L,null,D,X,C,I),C.onAfterShadow(t,C,A,L,D,X,I)}}}else if(V.visible){const z=_(C,V,T,S);C.onBeforeShadow(t,C,A,L,D,z,null),t.renderBufferDirect(L,null,D,z,C,null),C.onAfterShadow(t,C,A,L,D,z,null)}}const k=C.children;for(let D=0,V=k.length;D<V;D++)M(k[D],A,L,T,S)}function b(C){C.target.removeEventListener("dispose",b);for(const L in c){const T=c[L],S=C.target.uuid;S in T&&(T[S].dispose(),delete T[S])}}}function CA(t){function e(){let E=!1;const B=new It;let W=null;const te=new It(0,0,0,0);return{setMask:function(le){W!==le&&!E&&(t.colorMask(le,le,le,le),W=le)},setLocked:function(le){E=le},setClear:function(le,Fe,We,ft,bt){bt===!0&&(le*=ft,Fe*=ft,We*=ft),B.set(le,Fe,We,ft),te.equals(B)===!1&&(t.clearColor(le,Fe,We,ft),te.copy(B))},reset:function(){E=!1,W=null,te.set(-1,0,0,0)}}}function n(){let E=!1,B=null,W=null,te=null;return{setTest:function(le){le?he(t.DEPTH_TEST):ae(t.DEPTH_TEST)},setMask:function(le){B!==le&&!E&&(t.depthMask(le),B=le)},setFunc:function(le){if(W!==le){switch(le){case zS:t.depthFunc(t.NEVER);break;case BS:t.depthFunc(t.ALWAYS);break;case HS:t.depthFunc(t.LESS);break;case Ol:t.depthFunc(t.LEQUAL);break;case VS:t.depthFunc(t.EQUAL);break;case GS:t.depthFunc(t.GEQUAL);break;case jS:t.depthFunc(t.GREATER);break;case WS:t.depthFunc(t.NOTEQUAL);break;default:t.depthFunc(t.LEQUAL)}W=le}},setLocked:function(le){E=le},setClear:function(le){te!==le&&(t.clearDepth(le),te=le)},reset:function(){E=!1,B=null,W=null,te=null}}}function i(){let E=!1,B=null,W=null,te=null,le=null,Fe=null,We=null,ft=null,bt=null;return{setTest:function(Ze){E||(Ze?he(t.STENCIL_TEST):ae(t.STENCIL_TEST))},setMask:function(Ze){B!==Ze&&!E&&(t.stencilMask(Ze),B=Ze)},setFunc:function(Ze,yt,at){(W!==Ze||te!==yt||le!==at)&&(t.stencilFunc(Ze,yt,at),W=Ze,te=yt,le=at)},setOp:function(Ze,yt,at){(Fe!==Ze||We!==yt||ft!==at)&&(t.stencilOp(Ze,yt,at),Fe=Ze,We=yt,ft=at)},setLocked:function(Ze){E=Ze},setClear:function(Ze){bt!==Ze&&(t.clearStencil(Ze),bt=Ze)},reset:function(){E=!1,B=null,W=null,te=null,le=null,Fe=null,We=null,ft=null,bt=null}}}const r=new e,s=new n,o=new i,a=new WeakMap,l=new WeakMap;let c={},f={},d=new WeakMap,h=[],p=null,g=!1,x=null,m=null,u=null,v=null,_=null,M=null,b=null,C=new Ge(0,0,0),A=0,L=!1,T=null,S=null,U=null,k=null,D=null;const V=t.getParameter(t.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let z=!1,O=0;const Z=t.getParameter(t.VERSION);Z.indexOf("WebGL")!==-1?(O=parseFloat(/^WebGL (\d)/.exec(Z)[1]),z=O>=1):Z.indexOf("OpenGL ES")!==-1&&(O=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),z=O>=2);let I=null,G={};const X=t.getParameter(t.SCISSOR_BOX),ee=t.getParameter(t.VIEWPORT),ue=new It().fromArray(X),be=new It().fromArray(ee);function K(E,B,W,te){const le=new Uint8Array(4),Fe=t.createTexture();t.bindTexture(E,Fe),t.texParameteri(E,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(E,t.TEXTURE_MAG_FILTER,t.NEAREST);for(let We=0;We<W;We++)E===t.TEXTURE_3D||E===t.TEXTURE_2D_ARRAY?t.texImage3D(B,0,t.RGBA,1,1,te,0,t.RGBA,t.UNSIGNED_BYTE,le):t.texImage2D(B+We,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,le);return Fe}const ne={};ne[t.TEXTURE_2D]=K(t.TEXTURE_2D,t.TEXTURE_2D,1),ne[t.TEXTURE_CUBE_MAP]=K(t.TEXTURE_CUBE_MAP,t.TEXTURE_CUBE_MAP_POSITIVE_X,6),ne[t.TEXTURE_2D_ARRAY]=K(t.TEXTURE_2D_ARRAY,t.TEXTURE_2D_ARRAY,1,1),ne[t.TEXTURE_3D]=K(t.TEXTURE_3D,t.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),o.setClear(0),he(t.DEPTH_TEST),s.setFunc(Ol),we(!1),Ce(sp),he(t.CULL_FACE),Ve(Si);function he(E){c[E]!==!0&&(t.enable(E),c[E]=!0)}function ae(E){c[E]!==!1&&(t.disable(E),c[E]=!1)}function He(E,B){return f[E]!==B?(t.bindFramebuffer(E,B),f[E]=B,E===t.DRAW_FRAMEBUFFER&&(f[t.FRAMEBUFFER]=B),E===t.FRAMEBUFFER&&(f[t.DRAW_FRAMEBUFFER]=B),!0):!1}function Ne(E,B){let W=h,te=!1;if(E){W=d.get(B),W===void 0&&(W=[],d.set(B,W));const le=E.textures;if(W.length!==le.length||W[0]!==t.COLOR_ATTACHMENT0){for(let Fe=0,We=le.length;Fe<We;Fe++)W[Fe]=t.COLOR_ATTACHMENT0+Fe;W.length=le.length,te=!0}}else W[0]!==t.BACK&&(W[0]=t.BACK,te=!0);te&&t.drawBuffers(W)}function N(E){return p!==E?(t.useProgram(E),p=E,!0):!1}const xe={[Mr]:t.FUNC_ADD,[MS]:t.FUNC_SUBTRACT,[ES]:t.FUNC_REVERSE_SUBTRACT};xe[TS]=t.MIN,xe[wS]=t.MAX;const oe={[AS]:t.ZERO,[CS]:t.ONE,[RS]:t.SRC_COLOR,[Ed]:t.SRC_ALPHA,[IS]:t.SRC_ALPHA_SATURATE,[NS]:t.DST_COLOR,[PS]:t.DST_ALPHA,[bS]:t.ONE_MINUS_SRC_COLOR,[Td]:t.ONE_MINUS_SRC_ALPHA,[DS]:t.ONE_MINUS_DST_COLOR,[LS]:t.ONE_MINUS_DST_ALPHA,[US]:t.CONSTANT_COLOR,[FS]:t.ONE_MINUS_CONSTANT_COLOR,[OS]:t.CONSTANT_ALPHA,[kS]:t.ONE_MINUS_CONSTANT_ALPHA};function Ve(E,B,W,te,le,Fe,We,ft,bt,Ze){if(E===Si){g===!0&&(ae(t.BLEND),g=!1);return}if(g===!1&&(he(t.BLEND),g=!0),E!==SS){if(E!==x||Ze!==L){if((m!==Mr||_!==Mr)&&(t.blendEquation(t.FUNC_ADD),m=Mr,_=Mr),Ze)switch(E){case Rs:t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case Md:t.blendFunc(t.ONE,t.ONE);break;case op:t.blendFuncSeparate(t.ZERO,t.ONE_MINUS_SRC_COLOR,t.ZERO,t.ONE);break;case ap:t.blendFuncSeparate(t.ZERO,t.SRC_COLOR,t.ZERO,t.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",E);break}else switch(E){case Rs:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case Md:t.blendFunc(t.SRC_ALPHA,t.ONE);break;case op:t.blendFuncSeparate(t.ZERO,t.ONE_MINUS_SRC_COLOR,t.ZERO,t.ONE);break;case ap:t.blendFunc(t.ZERO,t.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",E);break}u=null,v=null,M=null,b=null,C.set(0,0,0),A=0,x=E,L=Ze}return}le=le||B,Fe=Fe||W,We=We||te,(B!==m||le!==_)&&(t.blendEquationSeparate(xe[B],xe[le]),m=B,_=le),(W!==u||te!==v||Fe!==M||We!==b)&&(t.blendFuncSeparate(oe[W],oe[te],oe[Fe],oe[We]),u=W,v=te,M=Fe,b=We),(ft.equals(C)===!1||bt!==A)&&(t.blendColor(ft.r,ft.g,ft.b,bt),C.copy(ft),A=bt),x=E,L=!1}function ge(E,B){E.side===Jn?ae(t.CULL_FACE):he(t.CULL_FACE);let W=E.side===ln;B&&(W=!W),we(W),E.blending===Rs&&E.transparent===!1?Ve(Si):Ve(E.blending,E.blendEquation,E.blendSrc,E.blendDst,E.blendEquationAlpha,E.blendSrcAlpha,E.blendDstAlpha,E.blendColor,E.blendAlpha,E.premultipliedAlpha),s.setFunc(E.depthFunc),s.setTest(E.depthTest),s.setMask(E.depthWrite),r.setMask(E.colorWrite);const te=E.stencilWrite;o.setTest(te),te&&(o.setMask(E.stencilWriteMask),o.setFunc(E.stencilFunc,E.stencilRef,E.stencilFuncMask),o.setOp(E.stencilFail,E.stencilZFail,E.stencilZPass)),et(E.polygonOffset,E.polygonOffsetFactor,E.polygonOffsetUnits),E.alphaToCoverage===!0?he(t.SAMPLE_ALPHA_TO_COVERAGE):ae(t.SAMPLE_ALPHA_TO_COVERAGE)}function we(E){T!==E&&(E?t.frontFace(t.CW):t.frontFace(t.CCW),T=E)}function Ce(E){E!==xS?(he(t.CULL_FACE),E!==S&&(E===sp?t.cullFace(t.BACK):E===yS?t.cullFace(t.FRONT):t.cullFace(t.FRONT_AND_BACK))):ae(t.CULL_FACE),S=E}function Pe(E){E!==U&&(z&&t.lineWidth(E),U=E)}function et(E,B,W){E?(he(t.POLYGON_OFFSET_FILL),(k!==B||D!==W)&&(t.polygonOffset(B,W),k=B,D=W)):ae(t.POLYGON_OFFSET_FILL)}function P(E){E?he(t.SCISSOR_TEST):ae(t.SCISSOR_TEST)}function w(E){E===void 0&&(E=t.TEXTURE0+V-1),I!==E&&(t.activeTexture(E),I=E)}function j(E,B,W){W===void 0&&(I===null?W=t.TEXTURE0+V-1:W=I);let te=G[W];te===void 0&&(te={type:void 0,texture:void 0},G[W]=te),(te.type!==E||te.texture!==B)&&(I!==W&&(t.activeTexture(W),I=W),t.bindTexture(E,B||ne[E]),te.type=E,te.texture=B)}function Q(){const E=G[I];E!==void 0&&E.type!==void 0&&(t.bindTexture(E.type,null),E.type=void 0,E.texture=void 0)}function ie(){try{t.compressedTexImage2D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function re(){try{t.compressedTexImage3D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Te(){try{t.texSubImage2D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function pe(){try{t.texSubImage3D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function fe(){try{t.compressedTexSubImage2D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Le(){try{t.compressedTexSubImage3D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function ce(){try{t.texStorage2D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ee(){try{t.texStorage3D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ye(){try{t.texImage2D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function Ae(){try{t.texImage3D.apply(t,arguments)}catch(E){console.error("THREE.WebGLState:",E)}}function _e(E){ue.equals(E)===!1&&(t.scissor(E.x,E.y,E.z,E.w),ue.copy(E))}function Ue(E){be.equals(E)===!1&&(t.viewport(E.x,E.y,E.z,E.w),be.copy(E))}function je(E,B){let W=l.get(B);W===void 0&&(W=new WeakMap,l.set(B,W));let te=W.get(E);te===void 0&&(te=t.getUniformBlockIndex(B,E.name),W.set(E,te))}function it(E,B){const te=l.get(B).get(E);a.get(B)!==te&&(t.uniformBlockBinding(B,te,E.__bindingPointIndex),a.set(B,te))}function Oe(){t.disable(t.BLEND),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),t.disable(t.POLYGON_OFFSET_FILL),t.disable(t.SCISSOR_TEST),t.disable(t.STENCIL_TEST),t.disable(t.SAMPLE_ALPHA_TO_COVERAGE),t.blendEquation(t.FUNC_ADD),t.blendFunc(t.ONE,t.ZERO),t.blendFuncSeparate(t.ONE,t.ZERO,t.ONE,t.ZERO),t.blendColor(0,0,0,0),t.colorMask(!0,!0,!0,!0),t.clearColor(0,0,0,0),t.depthMask(!0),t.depthFunc(t.LESS),t.clearDepth(1),t.stencilMask(4294967295),t.stencilFunc(t.ALWAYS,0,4294967295),t.stencilOp(t.KEEP,t.KEEP,t.KEEP),t.clearStencil(0),t.cullFace(t.BACK),t.frontFace(t.CCW),t.polygonOffset(0,0),t.activeTexture(t.TEXTURE0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.useProgram(null),t.lineWidth(1),t.scissor(0,0,t.canvas.width,t.canvas.height),t.viewport(0,0,t.canvas.width,t.canvas.height),c={},I=null,G={},f={},d=new WeakMap,h=[],p=null,g=!1,x=null,m=null,u=null,v=null,_=null,M=null,b=null,C=new Ge(0,0,0),A=0,L=!1,T=null,S=null,U=null,k=null,D=null,ue.set(0,0,t.canvas.width,t.canvas.height),be.set(0,0,t.canvas.width,t.canvas.height),r.reset(),s.reset(),o.reset()}return{buffers:{color:r,depth:s,stencil:o},enable:he,disable:ae,bindFramebuffer:He,drawBuffers:Ne,useProgram:N,setBlending:Ve,setMaterial:ge,setFlipSided:we,setCullFace:Ce,setLineWidth:Pe,setPolygonOffset:et,setScissorTest:P,activeTexture:w,bindTexture:j,unbindTexture:Q,compressedTexImage2D:ie,compressedTexImage3D:re,texImage2D:Ye,texImage3D:Ae,updateUBOMapping:je,uniformBlockBinding:it,texStorage2D:ce,texStorage3D:Ee,texSubImage2D:Te,texSubImage3D:pe,compressedTexSubImage2D:fe,compressedTexSubImage3D:Le,scissor:_e,viewport:Ue,reset:Oe}}function RA(t,e,n,i,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ye,f=new WeakMap;let d;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(P,w){return p?new OffscreenCanvas(P,w):Vl("canvas")}function x(P,w,j){let Q=1;const ie=et(P);if((ie.width>j||ie.height>j)&&(Q=j/Math.max(ie.width,ie.height)),Q<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const re=Math.floor(Q*ie.width),Te=Math.floor(Q*ie.height);d===void 0&&(d=g(re,Te));const pe=w?g(re,Te):d;return pe.width=re,pe.height=Te,pe.getContext("2d").drawImage(P,0,0,re,Te),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ie.width+"x"+ie.height+") to ("+re+"x"+Te+")."),pe}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ie.width+"x"+ie.height+")."),P;return P}function m(P){return P.generateMipmaps&&P.minFilter!==Pn&&P.minFilter!==jn}function u(P){t.generateMipmap(P)}function v(P,w,j,Q,ie=!1){if(P!==null){if(t[P]!==void 0)return t[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let re=w;if(w===t.RED&&(j===t.FLOAT&&(re=t.R32F),j===t.HALF_FLOAT&&(re=t.R16F),j===t.UNSIGNED_BYTE&&(re=t.R8)),w===t.RED_INTEGER&&(j===t.UNSIGNED_BYTE&&(re=t.R8UI),j===t.UNSIGNED_SHORT&&(re=t.R16UI),j===t.UNSIGNED_INT&&(re=t.R32UI),j===t.BYTE&&(re=t.R8I),j===t.SHORT&&(re=t.R16I),j===t.INT&&(re=t.R32I)),w===t.RG&&(j===t.FLOAT&&(re=t.RG32F),j===t.HALF_FLOAT&&(re=t.RG16F),j===t.UNSIGNED_BYTE&&(re=t.RG8)),w===t.RG_INTEGER&&(j===t.UNSIGNED_BYTE&&(re=t.RG8UI),j===t.UNSIGNED_SHORT&&(re=t.RG16UI),j===t.UNSIGNED_INT&&(re=t.RG32UI),j===t.BYTE&&(re=t.RG8I),j===t.SHORT&&(re=t.RG16I),j===t.INT&&(re=t.RG32I)),w===t.RGB&&j===t.UNSIGNED_INT_5_9_9_9_REV&&(re=t.RGB9_E5),w===t.RGBA){const Te=ie?kl:tt.getTransfer(Q);j===t.FLOAT&&(re=t.RGBA32F),j===t.HALF_FLOAT&&(re=t.RGBA16F),j===t.UNSIGNED_BYTE&&(re=Te===rt?t.SRGB8_ALPHA8:t.RGBA8),j===t.UNSIGNED_SHORT_4_4_4_4&&(re=t.RGBA4),j===t.UNSIGNED_SHORT_5_5_5_1&&(re=t.RGB5_A1)}return(re===t.R16F||re===t.R32F||re===t.RG16F||re===t.RG32F||re===t.RGBA16F||re===t.RGBA32F)&&e.get("EXT_color_buffer_float"),re}function _(P,w){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==Pn&&P.minFilter!==jn?Math.log2(Math.max(w.width,w.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?w.mipmaps.length:1}function M(P){const w=P.target;w.removeEventListener("dispose",M),C(w),w.isVideoTexture&&f.delete(w)}function b(P){const w=P.target;w.removeEventListener("dispose",b),L(w)}function C(P){const w=i.get(P);if(w.__webglInit===void 0)return;const j=P.source,Q=h.get(j);if(Q){const ie=Q[w.__cacheKey];ie.usedTimes--,ie.usedTimes===0&&A(P),Object.keys(Q).length===0&&h.delete(j)}i.remove(P)}function A(P){const w=i.get(P);t.deleteTexture(w.__webglTexture);const j=P.source,Q=h.get(j);delete Q[w.__cacheKey],o.memory.textures--}function L(P){const w=i.get(P);if(P.depthTexture&&P.depthTexture.dispose(),P.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(w.__webglFramebuffer[Q]))for(let ie=0;ie<w.__webglFramebuffer[Q].length;ie++)t.deleteFramebuffer(w.__webglFramebuffer[Q][ie]);else t.deleteFramebuffer(w.__webglFramebuffer[Q]);w.__webglDepthbuffer&&t.deleteRenderbuffer(w.__webglDepthbuffer[Q])}else{if(Array.isArray(w.__webglFramebuffer))for(let Q=0;Q<w.__webglFramebuffer.length;Q++)t.deleteFramebuffer(w.__webglFramebuffer[Q]);else t.deleteFramebuffer(w.__webglFramebuffer);if(w.__webglDepthbuffer&&t.deleteRenderbuffer(w.__webglDepthbuffer),w.__webglMultisampledFramebuffer&&t.deleteFramebuffer(w.__webglMultisampledFramebuffer),w.__webglColorRenderbuffer)for(let Q=0;Q<w.__webglColorRenderbuffer.length;Q++)w.__webglColorRenderbuffer[Q]&&t.deleteRenderbuffer(w.__webglColorRenderbuffer[Q]);w.__webglDepthRenderbuffer&&t.deleteRenderbuffer(w.__webglDepthRenderbuffer)}const j=P.textures;for(let Q=0,ie=j.length;Q<ie;Q++){const re=i.get(j[Q]);re.__webglTexture&&(t.deleteTexture(re.__webglTexture),o.memory.textures--),i.remove(j[Q])}i.remove(P)}let T=0;function S(){T=0}function U(){const P=T;return P>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+r.maxTextures),T+=1,P}function k(P){const w=[];return w.push(P.wrapS),w.push(P.wrapT),w.push(P.wrapR||0),w.push(P.magFilter),w.push(P.minFilter),w.push(P.anisotropy),w.push(P.internalFormat),w.push(P.format),w.push(P.type),w.push(P.generateMipmaps),w.push(P.premultiplyAlpha),w.push(P.flipY),w.push(P.unpackAlignment),w.push(P.colorSpace),w.join()}function D(P,w){const j=i.get(P);if(P.isVideoTexture&&Ce(P),P.isRenderTargetTexture===!1&&P.version>0&&j.__version!==P.version){const Q=P.image;if(Q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ue(j,P,w);return}}n.bindTexture(t.TEXTURE_2D,j.__webglTexture,t.TEXTURE0+w)}function V(P,w){const j=i.get(P);if(P.version>0&&j.__version!==P.version){ue(j,P,w);return}n.bindTexture(t.TEXTURE_2D_ARRAY,j.__webglTexture,t.TEXTURE0+w)}function z(P,w){const j=i.get(P);if(P.version>0&&j.__version!==P.version){ue(j,P,w);return}n.bindTexture(t.TEXTURE_3D,j.__webglTexture,t.TEXTURE0+w)}function O(P,w){const j=i.get(P);if(P.version>0&&j.__version!==P.version){be(j,P,w);return}n.bindTexture(t.TEXTURE_CUBE_MAP,j.__webglTexture,t.TEXTURE0+w)}const Z={[Cd]:t.REPEAT,[Cr]:t.CLAMP_TO_EDGE,[Rd]:t.MIRRORED_REPEAT},I={[Pn]:t.NEAREST,[qS]:t.NEAREST_MIPMAP_NEAREST,[Aa]:t.NEAREST_MIPMAP_LINEAR,[jn]:t.LINEAR,[Xc]:t.LINEAR_MIPMAP_NEAREST,[Rr]:t.LINEAR_MIPMAP_LINEAR},G={[cM]:t.NEVER,[mM]:t.ALWAYS,[uM]:t.LESS,[zv]:t.LEQUAL,[dM]:t.EQUAL,[pM]:t.GEQUAL,[fM]:t.GREATER,[hM]:t.NOTEQUAL};function X(P,w){if(w.type===$i&&e.has("OES_texture_float_linear")===!1&&(w.magFilter===jn||w.magFilter===Xc||w.magFilter===Aa||w.magFilter===Rr||w.minFilter===jn||w.minFilter===Xc||w.minFilter===Aa||w.minFilter===Rr)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),t.texParameteri(P,t.TEXTURE_WRAP_S,Z[w.wrapS]),t.texParameteri(P,t.TEXTURE_WRAP_T,Z[w.wrapT]),(P===t.TEXTURE_3D||P===t.TEXTURE_2D_ARRAY)&&t.texParameteri(P,t.TEXTURE_WRAP_R,Z[w.wrapR]),t.texParameteri(P,t.TEXTURE_MAG_FILTER,I[w.magFilter]),t.texParameteri(P,t.TEXTURE_MIN_FILTER,I[w.minFilter]),w.compareFunction&&(t.texParameteri(P,t.TEXTURE_COMPARE_MODE,t.COMPARE_REF_TO_TEXTURE),t.texParameteri(P,t.TEXTURE_COMPARE_FUNC,G[w.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(w.magFilter===Pn||w.minFilter!==Aa&&w.minFilter!==Rr||w.type===$i&&e.has("OES_texture_float_linear")===!1)return;if(w.anisotropy>1||i.get(w).__currentAnisotropy){const j=e.get("EXT_texture_filter_anisotropic");t.texParameterf(P,j.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(w.anisotropy,r.getMaxAnisotropy())),i.get(w).__currentAnisotropy=w.anisotropy}}}function ee(P,w){let j=!1;P.__webglInit===void 0&&(P.__webglInit=!0,w.addEventListener("dispose",M));const Q=w.source;let ie=h.get(Q);ie===void 0&&(ie={},h.set(Q,ie));const re=k(w);if(re!==P.__cacheKey){ie[re]===void 0&&(ie[re]={texture:t.createTexture(),usedTimes:0},o.memory.textures++,j=!0),ie[re].usedTimes++;const Te=ie[P.__cacheKey];Te!==void 0&&(ie[P.__cacheKey].usedTimes--,Te.usedTimes===0&&A(w)),P.__cacheKey=re,P.__webglTexture=ie[re].texture}return j}function ue(P,w,j){let Q=t.TEXTURE_2D;(w.isDataArrayTexture||w.isCompressedArrayTexture)&&(Q=t.TEXTURE_2D_ARRAY),w.isData3DTexture&&(Q=t.TEXTURE_3D);const ie=ee(P,w),re=w.source;n.bindTexture(Q,P.__webglTexture,t.TEXTURE0+j);const Te=i.get(re);if(re.version!==Te.__version||ie===!0){n.activeTexture(t.TEXTURE0+j);const pe=tt.getPrimaries(tt.workingColorSpace),fe=w.colorSpace===Gi?null:tt.getPrimaries(w.colorSpace),Le=w.colorSpace===Gi||pe===fe?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,w.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,w.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Le);let ce=x(w.image,!1,r.maxTextureSize);ce=Pe(w,ce);const Ee=s.convert(w.format,w.colorSpace),Ye=s.convert(w.type);let Ae=v(w.internalFormat,Ee,Ye,w.colorSpace,w.isVideoTexture);X(Q,w);let _e;const Ue=w.mipmaps,je=w.isVideoTexture!==!0,it=Te.__version===void 0||ie===!0,Oe=re.dataReady,E=_(w,ce);if(w.isDepthTexture)Ae=t.DEPTH_COMPONENT16,w.type===$i?Ae=t.DEPTH_COMPONENT32F:w.type===Hs?Ae=t.DEPTH_COMPONENT24:w.type===aa&&(Ae=t.DEPTH24_STENCIL8),it&&(je?n.texStorage2D(t.TEXTURE_2D,1,Ae,ce.width,ce.height):n.texImage2D(t.TEXTURE_2D,0,Ae,ce.width,ce.height,0,Ee,Ye,null));else if(w.isDataTexture)if(Ue.length>0){je&&it&&n.texStorage2D(t.TEXTURE_2D,E,Ae,Ue[0].width,Ue[0].height);for(let B=0,W=Ue.length;B<W;B++)_e=Ue[B],je?Oe&&n.texSubImage2D(t.TEXTURE_2D,B,0,0,_e.width,_e.height,Ee,Ye,_e.data):n.texImage2D(t.TEXTURE_2D,B,Ae,_e.width,_e.height,0,Ee,Ye,_e.data);w.generateMipmaps=!1}else je?(it&&n.texStorage2D(t.TEXTURE_2D,E,Ae,ce.width,ce.height),Oe&&n.texSubImage2D(t.TEXTURE_2D,0,0,0,ce.width,ce.height,Ee,Ye,ce.data)):n.texImage2D(t.TEXTURE_2D,0,Ae,ce.width,ce.height,0,Ee,Ye,ce.data);else if(w.isCompressedTexture)if(w.isCompressedArrayTexture){je&&it&&n.texStorage3D(t.TEXTURE_2D_ARRAY,E,Ae,Ue[0].width,Ue[0].height,ce.depth);for(let B=0,W=Ue.length;B<W;B++)_e=Ue[B],w.format!==ti?Ee!==null?je?Oe&&n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,B,0,0,0,_e.width,_e.height,ce.depth,Ee,_e.data,0,0):n.compressedTexImage3D(t.TEXTURE_2D_ARRAY,B,Ae,_e.width,_e.height,ce.depth,0,_e.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):je?Oe&&n.texSubImage3D(t.TEXTURE_2D_ARRAY,B,0,0,0,_e.width,_e.height,ce.depth,Ee,Ye,_e.data):n.texImage3D(t.TEXTURE_2D_ARRAY,B,Ae,_e.width,_e.height,ce.depth,0,Ee,Ye,_e.data)}else{je&&it&&n.texStorage2D(t.TEXTURE_2D,E,Ae,Ue[0].width,Ue[0].height);for(let B=0,W=Ue.length;B<W;B++)_e=Ue[B],w.format!==ti?Ee!==null?je?Oe&&n.compressedTexSubImage2D(t.TEXTURE_2D,B,0,0,_e.width,_e.height,Ee,_e.data):n.compressedTexImage2D(t.TEXTURE_2D,B,Ae,_e.width,_e.height,0,_e.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):je?Oe&&n.texSubImage2D(t.TEXTURE_2D,B,0,0,_e.width,_e.height,Ee,Ye,_e.data):n.texImage2D(t.TEXTURE_2D,B,Ae,_e.width,_e.height,0,Ee,Ye,_e.data)}else if(w.isDataArrayTexture)je?(it&&n.texStorage3D(t.TEXTURE_2D_ARRAY,E,Ae,ce.width,ce.height,ce.depth),Oe&&n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,0,ce.width,ce.height,ce.depth,Ee,Ye,ce.data)):n.texImage3D(t.TEXTURE_2D_ARRAY,0,Ae,ce.width,ce.height,ce.depth,0,Ee,Ye,ce.data);else if(w.isData3DTexture)je?(it&&n.texStorage3D(t.TEXTURE_3D,E,Ae,ce.width,ce.height,ce.depth),Oe&&n.texSubImage3D(t.TEXTURE_3D,0,0,0,0,ce.width,ce.height,ce.depth,Ee,Ye,ce.data)):n.texImage3D(t.TEXTURE_3D,0,Ae,ce.width,ce.height,ce.depth,0,Ee,Ye,ce.data);else if(w.isFramebufferTexture){if(it)if(je)n.texStorage2D(t.TEXTURE_2D,E,Ae,ce.width,ce.height);else{let B=ce.width,W=ce.height;for(let te=0;te<E;te++)n.texImage2D(t.TEXTURE_2D,te,Ae,B,W,0,Ee,Ye,null),B>>=1,W>>=1}}else if(Ue.length>0){if(je&&it){const B=et(Ue[0]);n.texStorage2D(t.TEXTURE_2D,E,Ae,B.width,B.height)}for(let B=0,W=Ue.length;B<W;B++)_e=Ue[B],je?Oe&&n.texSubImage2D(t.TEXTURE_2D,B,0,0,Ee,Ye,_e):n.texImage2D(t.TEXTURE_2D,B,Ae,Ee,Ye,_e);w.generateMipmaps=!1}else if(je){if(it){const B=et(ce);n.texStorage2D(t.TEXTURE_2D,E,Ae,B.width,B.height)}Oe&&n.texSubImage2D(t.TEXTURE_2D,0,0,0,Ee,Ye,ce)}else n.texImage2D(t.TEXTURE_2D,0,Ae,Ee,Ye,ce);m(w)&&u(Q),Te.__version=re.version,w.onUpdate&&w.onUpdate(w)}P.__version=w.version}function be(P,w,j){if(w.image.length!==6)return;const Q=ee(P,w),ie=w.source;n.bindTexture(t.TEXTURE_CUBE_MAP,P.__webglTexture,t.TEXTURE0+j);const re=i.get(ie);if(ie.version!==re.__version||Q===!0){n.activeTexture(t.TEXTURE0+j);const Te=tt.getPrimaries(tt.workingColorSpace),pe=w.colorSpace===Gi?null:tt.getPrimaries(w.colorSpace),fe=w.colorSpace===Gi||Te===pe?t.NONE:t.BROWSER_DEFAULT_WEBGL;t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,w.flipY),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,w.unpackAlignment),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,fe);const Le=w.isCompressedTexture||w.image[0].isCompressedTexture,ce=w.image[0]&&w.image[0].isDataTexture,Ee=[];for(let W=0;W<6;W++)!Le&&!ce?Ee[W]=x(w.image[W],!0,r.maxCubemapSize):Ee[W]=ce?w.image[W].image:w.image[W],Ee[W]=Pe(w,Ee[W]);const Ye=Ee[0],Ae=s.convert(w.format,w.colorSpace),_e=s.convert(w.type),Ue=v(w.internalFormat,Ae,_e,w.colorSpace),je=w.isVideoTexture!==!0,it=re.__version===void 0||Q===!0,Oe=ie.dataReady;let E=_(w,Ye);X(t.TEXTURE_CUBE_MAP,w);let B;if(Le){je&&it&&n.texStorage2D(t.TEXTURE_CUBE_MAP,E,Ue,Ye.width,Ye.height);for(let W=0;W<6;W++){B=Ee[W].mipmaps;for(let te=0;te<B.length;te++){const le=B[te];w.format!==ti?Ae!==null?je?Oe&&n.compressedTexSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te,0,0,le.width,le.height,Ae,le.data):n.compressedTexImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te,Ue,le.width,le.height,0,le.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):je?Oe&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te,0,0,le.width,le.height,Ae,_e,le.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te,Ue,le.width,le.height,0,Ae,_e,le.data)}}}else{if(B=w.mipmaps,je&&it){B.length>0&&E++;const W=et(Ee[0]);n.texStorage2D(t.TEXTURE_CUBE_MAP,E,Ue,W.width,W.height)}for(let W=0;W<6;W++)if(ce){je?Oe&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,0,0,0,Ee[W].width,Ee[W].height,Ae,_e,Ee[W].data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,0,Ue,Ee[W].width,Ee[W].height,0,Ae,_e,Ee[W].data);for(let te=0;te<B.length;te++){const Fe=B[te].image[W].image;je?Oe&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te+1,0,0,Fe.width,Fe.height,Ae,_e,Fe.data):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te+1,Ue,Fe.width,Fe.height,0,Ae,_e,Fe.data)}}else{je?Oe&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,0,0,0,Ae,_e,Ee[W]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,0,Ue,Ae,_e,Ee[W]);for(let te=0;te<B.length;te++){const le=B[te];je?Oe&&n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te+1,0,0,Ae,_e,le.image[W]):n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+W,te+1,Ue,Ae,_e,le.image[W])}}}m(w)&&u(t.TEXTURE_CUBE_MAP),re.__version=ie.version,w.onUpdate&&w.onUpdate(w)}P.__version=w.version}function K(P,w,j,Q,ie,re){const Te=s.convert(j.format,j.colorSpace),pe=s.convert(j.type),fe=v(j.internalFormat,Te,pe,j.colorSpace);if(!i.get(w).__hasExternalTextures){const ce=Math.max(1,w.width>>re),Ee=Math.max(1,w.height>>re);ie===t.TEXTURE_3D||ie===t.TEXTURE_2D_ARRAY?n.texImage3D(ie,re,fe,ce,Ee,w.depth,0,Te,pe,null):n.texImage2D(ie,re,fe,ce,Ee,0,Te,pe,null)}n.bindFramebuffer(t.FRAMEBUFFER,P),we(w)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,Q,ie,i.get(j).__webglTexture,0,ge(w)):(ie===t.TEXTURE_2D||ie>=t.TEXTURE_CUBE_MAP_POSITIVE_X&&ie<=t.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&t.framebufferTexture2D(t.FRAMEBUFFER,Q,ie,i.get(j).__webglTexture,re),n.bindFramebuffer(t.FRAMEBUFFER,null)}function ne(P,w,j){if(t.bindRenderbuffer(t.RENDERBUFFER,P),w.depthBuffer&&!w.stencilBuffer){let Q=t.DEPTH_COMPONENT24;if(j||we(w)){const ie=w.depthTexture;ie&&ie.isDepthTexture&&(ie.type===$i?Q=t.DEPTH_COMPONENT32F:ie.type===Hs&&(Q=t.DEPTH_COMPONENT24));const re=ge(w);we(w)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,re,Q,w.width,w.height):t.renderbufferStorageMultisample(t.RENDERBUFFER,re,Q,w.width,w.height)}else t.renderbufferStorage(t.RENDERBUFFER,Q,w.width,w.height);t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.RENDERBUFFER,P)}else if(w.depthBuffer&&w.stencilBuffer){const Q=ge(w);j&&we(w)===!1?t.renderbufferStorageMultisample(t.RENDERBUFFER,Q,t.DEPTH24_STENCIL8,w.width,w.height):we(w)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Q,t.DEPTH24_STENCIL8,w.width,w.height):t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_STENCIL,w.width,w.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.RENDERBUFFER,P)}else{const Q=w.textures;for(let ie=0;ie<Q.length;ie++){const re=Q[ie],Te=s.convert(re.format,re.colorSpace),pe=s.convert(re.type),fe=v(re.internalFormat,Te,pe,re.colorSpace),Le=ge(w);j&&we(w)===!1?t.renderbufferStorageMultisample(t.RENDERBUFFER,Le,fe,w.width,w.height):we(w)?a.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Le,fe,w.width,w.height):t.renderbufferStorage(t.RENDERBUFFER,fe,w.width,w.height)}}t.bindRenderbuffer(t.RENDERBUFFER,null)}function he(P,w){if(w&&w.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(t.FRAMEBUFFER,P),!(w.depthTexture&&w.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(w.depthTexture).__webglTexture||w.depthTexture.image.width!==w.width||w.depthTexture.image.height!==w.height)&&(w.depthTexture.image.width=w.width,w.depthTexture.image.height=w.height,w.depthTexture.needsUpdate=!0),D(w.depthTexture,0);const Q=i.get(w.depthTexture).__webglTexture,ie=ge(w);if(w.depthTexture.format===bs)we(w)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,Q,0,ie):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,Q,0);else if(w.depthTexture.format===Jo)we(w)?a.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,Q,0,ie):t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_STENCIL_ATTACHMENT,t.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function ae(P){const w=i.get(P),j=P.isWebGLCubeRenderTarget===!0;if(P.depthTexture&&!w.__autoAllocateDepthBuffer){if(j)throw new Error("target.depthTexture not supported in Cube render targets");he(w.__webglFramebuffer,P)}else if(j){w.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)n.bindFramebuffer(t.FRAMEBUFFER,w.__webglFramebuffer[Q]),w.__webglDepthbuffer[Q]=t.createRenderbuffer(),ne(w.__webglDepthbuffer[Q],P,!1)}else n.bindFramebuffer(t.FRAMEBUFFER,w.__webglFramebuffer),w.__webglDepthbuffer=t.createRenderbuffer(),ne(w.__webglDepthbuffer,P,!1);n.bindFramebuffer(t.FRAMEBUFFER,null)}function He(P,w,j){const Q=i.get(P);w!==void 0&&K(Q.__webglFramebuffer,P,P.texture,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,0),j!==void 0&&ae(P)}function Ne(P){const w=P.texture,j=i.get(P),Q=i.get(w);P.addEventListener("dispose",b);const ie=P.textures,re=P.isWebGLCubeRenderTarget===!0,Te=ie.length>1;if(Te||(Q.__webglTexture===void 0&&(Q.__webglTexture=t.createTexture()),Q.__version=w.version,o.memory.textures++),re){j.__webglFramebuffer=[];for(let pe=0;pe<6;pe++)if(w.mipmaps&&w.mipmaps.length>0){j.__webglFramebuffer[pe]=[];for(let fe=0;fe<w.mipmaps.length;fe++)j.__webglFramebuffer[pe][fe]=t.createFramebuffer()}else j.__webglFramebuffer[pe]=t.createFramebuffer()}else{if(w.mipmaps&&w.mipmaps.length>0){j.__webglFramebuffer=[];for(let pe=0;pe<w.mipmaps.length;pe++)j.__webglFramebuffer[pe]=t.createFramebuffer()}else j.__webglFramebuffer=t.createFramebuffer();if(Te)for(let pe=0,fe=ie.length;pe<fe;pe++){const Le=i.get(ie[pe]);Le.__webglTexture===void 0&&(Le.__webglTexture=t.createTexture(),o.memory.textures++)}if(P.samples>0&&we(P)===!1){j.__webglMultisampledFramebuffer=t.createFramebuffer(),j.__webglColorRenderbuffer=[],n.bindFramebuffer(t.FRAMEBUFFER,j.__webglMultisampledFramebuffer);for(let pe=0;pe<ie.length;pe++){const fe=ie[pe];j.__webglColorRenderbuffer[pe]=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,j.__webglColorRenderbuffer[pe]);const Le=s.convert(fe.format,fe.colorSpace),ce=s.convert(fe.type),Ee=v(fe.internalFormat,Le,ce,fe.colorSpace,P.isXRRenderTarget===!0),Ye=ge(P);t.renderbufferStorageMultisample(t.RENDERBUFFER,Ye,Ee,P.width,P.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+pe,t.RENDERBUFFER,j.__webglColorRenderbuffer[pe])}t.bindRenderbuffer(t.RENDERBUFFER,null),P.depthBuffer&&(j.__webglDepthRenderbuffer=t.createRenderbuffer(),ne(j.__webglDepthRenderbuffer,P,!0)),n.bindFramebuffer(t.FRAMEBUFFER,null)}}if(re){n.bindTexture(t.TEXTURE_CUBE_MAP,Q.__webglTexture),X(t.TEXTURE_CUBE_MAP,w);for(let pe=0;pe<6;pe++)if(w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)K(j.__webglFramebuffer[pe][fe],P,w,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+pe,fe);else K(j.__webglFramebuffer[pe],P,w,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0);m(w)&&u(t.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(Te){for(let pe=0,fe=ie.length;pe<fe;pe++){const Le=ie[pe],ce=i.get(Le);n.bindTexture(t.TEXTURE_2D,ce.__webglTexture),X(t.TEXTURE_2D,Le),K(j.__webglFramebuffer,P,Le,t.COLOR_ATTACHMENT0+pe,t.TEXTURE_2D,0),m(Le)&&u(t.TEXTURE_2D)}n.unbindTexture()}else{let pe=t.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(pe=P.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY),n.bindTexture(pe,Q.__webglTexture),X(pe,w),w.mipmaps&&w.mipmaps.length>0)for(let fe=0;fe<w.mipmaps.length;fe++)K(j.__webglFramebuffer[fe],P,w,t.COLOR_ATTACHMENT0,pe,fe);else K(j.__webglFramebuffer,P,w,t.COLOR_ATTACHMENT0,pe,0);m(w)&&u(pe),n.unbindTexture()}P.depthBuffer&&ae(P)}function N(P){const w=P.textures;for(let j=0,Q=w.length;j<Q;j++){const ie=w[j];if(m(ie)){const re=P.isWebGLCubeRenderTarget?t.TEXTURE_CUBE_MAP:t.TEXTURE_2D,Te=i.get(ie).__webglTexture;n.bindTexture(re,Te),u(re),n.unbindTexture()}}}const xe=[],oe=[];function Ve(P){if(P.samples>0){if(we(P)===!1){const w=P.textures,j=P.width,Q=P.height;let ie=t.COLOR_BUFFER_BIT;const re=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,Te=i.get(P),pe=w.length>1;if(pe)for(let fe=0;fe<w.length;fe++)n.bindFramebuffer(t.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+fe,t.RENDERBUFFER,null),n.bindFramebuffer(t.FRAMEBUFFER,Te.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+fe,t.TEXTURE_2D,null,0);n.bindFramebuffer(t.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let fe=0;fe<w.length;fe++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(ie|=t.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(ie|=t.STENCIL_BUFFER_BIT)),pe){t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.RENDERBUFFER,Te.__webglColorRenderbuffer[fe]);const Le=i.get(w[fe]).__webglTexture;t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,Le,0)}t.blitFramebuffer(0,0,j,Q,0,0,j,Q,ie,t.NEAREST),l===!0&&(xe.length=0,oe.length=0,xe.push(t.COLOR_ATTACHMENT0+fe),P.depthBuffer&&P.resolveDepthBuffer===!1&&(xe.push(re),oe.push(re),t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,oe)),t.invalidateFramebuffer(t.READ_FRAMEBUFFER,xe))}if(n.bindFramebuffer(t.READ_FRAMEBUFFER,null),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),pe)for(let fe=0;fe<w.length;fe++){n.bindFramebuffer(t.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+fe,t.RENDERBUFFER,Te.__webglColorRenderbuffer[fe]);const Le=i.get(w[fe]).__webglTexture;n.bindFramebuffer(t.FRAMEBUFFER,Te.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+fe,t.TEXTURE_2D,Le,0)}n.bindFramebuffer(t.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){const w=P.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,[w])}}}function ge(P){return Math.min(r.maxSamples,P.samples)}function we(P){const w=i.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&w.__useRenderToTexture!==!1}function Ce(P){const w=o.render.frame;f.get(P)!==w&&(f.set(P,w),P.update())}function Pe(P,w){const j=P.colorSpace,Q=P.format,ie=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||j!==dr&&j!==Gi&&(tt.getTransfer(j)===rt?(Q!==ti||ie!==ar)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",j)),w}function et(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=S,this.setTexture2D=D,this.setTexture2DArray=V,this.setTexture3D=z,this.setTextureCube=O,this.rebindTextures=He,this.setupRenderTarget=Ne,this.updateRenderTargetMipmap=N,this.updateMultisampleRenderTarget=Ve,this.setupDepthRenderbuffer=ae,this.setupFrameBufferTexture=K,this.useMultisampledRTT=we}function bA(t,e){function n(i,r=Gi){let s;const o=tt.getTransfer(r);if(i===ar)return t.UNSIGNED_BYTE;if(i===Dv)return t.UNSIGNED_SHORT_4_4_4_4;if(i===Iv)return t.UNSIGNED_SHORT_5_5_5_1;if(i===QS)return t.UNSIGNED_INT_5_9_9_9_REV;if(i===KS)return t.BYTE;if(i===ZS)return t.SHORT;if(i===Lv)return t.UNSIGNED_SHORT;if(i===Nv)return t.INT;if(i===Hs)return t.UNSIGNED_INT;if(i===$i)return t.FLOAT;if(i===ir)return t.HALF_FLOAT;if(i===JS)return t.ALPHA;if(i===eM)return t.RGB;if(i===ti)return t.RGBA;if(i===tM)return t.LUMINANCE;if(i===nM)return t.LUMINANCE_ALPHA;if(i===bs)return t.DEPTH_COMPONENT;if(i===Jo)return t.DEPTH_STENCIL;if(i===iM)return t.RED;if(i===Uv)return t.RED_INTEGER;if(i===rM)return t.RG;if(i===Fv)return t.RG_INTEGER;if(i===Ov)return t.RGBA_INTEGER;if(i===$c||i===Yc||i===qc||i===Kc)if(o===rt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===$c)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Yc)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===qc)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Kc)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===$c)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Yc)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===qc)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Kc)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===lp||i===cp||i===up||i===dp)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===lp)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===cp)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===up)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===dp)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===fp||i===hp||i===pp)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===fp||i===hp)return o===rt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===pp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===mp||i===gp||i===vp||i===_p||i===xp||i===yp||i===Sp||i===Mp||i===Ep||i===Tp||i===wp||i===Ap||i===Cp||i===Rp)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===mp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===gp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===vp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===_p)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===xp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===yp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Sp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Mp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Ep)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Tp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===wp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ap)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Cp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Rp)return o===rt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Zc||i===bp||i===Pp)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===Zc)return o===rt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===bp)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Pp)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===sM||i===Lp||i===Np||i===Dp)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===Zc)return s.COMPRESSED_RED_RGTC1_EXT;if(i===Lp)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Np)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Dp)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===aa?t.UNSIGNED_INT_24_8:t[i]!==void 0?t[i]:null}return{convert:n}}class PA extends Rn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class Eo extends At{constructor(){super(),this.isGroup=!0,this.type="Group"}}const LA={type:"move"};class Mu{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Eo,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Eo,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new F,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new F),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Eo,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new F,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new F),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const n=this._hand;if(n)for(const i of e.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,n,i){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&n.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const x of e.hand.values()){const m=n.getJointPose(x,i),u=this._getHandJoint(c,x);m!==null&&(u.matrix.fromArray(m.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=m.radius),u.visible=m!==null}const f=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],h=f.position.distanceTo(d.position),p=.02,g=.005;c.inputState.pinching&&h>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=n.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=n.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(LA)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,n){if(e.joints[n.jointName]===void 0){const i=new Eo;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[n.jointName]=i,e.add(i)}return e.joints[n.jointName]}}const NA=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,DA=`
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

}`;class IA{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,n,i){if(this.texture===null){const r=new cn,s=e.properties.get(r);s.__webglTexture=n.texture,(n.depthNear!=i.depthNear||n.depthFar!=i.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=r}}render(e,n){if(this.texture!==null){if(this.mesh===null){const i=n.cameras[0].viewport,r=new Zt({vertexShader:NA,fragmentShader:DA,uniforms:{depthColor:{value:this.texture},depthWidth:{value:i.z},depthHeight:{value:i.w}}});this.mesh=new Dt(new qs(20,20),r)}e.render(this.mesh,n)}}reset(){this.texture=null,this.mesh=null}}class UA extends kr{constructor(e,n){super();const i=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,f=null,d=null,h=null,p=null,g=null;const x=new IA,m=n.getContextAttributes();let u=null,v=null;const _=[],M=[],b=new ye;let C=null;const A=new Rn;A.layers.enable(1),A.viewport=new It;const L=new Rn;L.layers.enable(2),L.viewport=new It;const T=[A,L],S=new PA;S.layers.enable(1),S.layers.enable(2);let U=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let ne=_[K];return ne===void 0&&(ne=new Mu,_[K]=ne),ne.getTargetRaySpace()},this.getControllerGrip=function(K){let ne=_[K];return ne===void 0&&(ne=new Mu,_[K]=ne),ne.getGripSpace()},this.getHand=function(K){let ne=_[K];return ne===void 0&&(ne=new Mu,_[K]=ne),ne.getHandSpace()};function D(K){const ne=M.indexOf(K.inputSource);if(ne===-1)return;const he=_[ne];he!==void 0&&(he.update(K.inputSource,K.frame,c||o),he.dispatchEvent({type:K.type,data:K.inputSource}))}function V(){r.removeEventListener("select",D),r.removeEventListener("selectstart",D),r.removeEventListener("selectend",D),r.removeEventListener("squeeze",D),r.removeEventListener("squeezestart",D),r.removeEventListener("squeezeend",D),r.removeEventListener("end",V),r.removeEventListener("inputsourceschange",z);for(let K=0;K<_.length;K++){const ne=M[K];ne!==null&&(M[K]=null,_[K].disconnect(ne))}U=null,k=null,x.reset(),e.setRenderTarget(u),p=null,h=null,d=null,r=null,v=null,be.stop(),i.isPresenting=!1,e.setPixelRatio(C),e.setSize(b.width,b.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){s=K,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return d},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(K){if(r=K,r!==null){if(u=e.getRenderTarget(),r.addEventListener("select",D),r.addEventListener("selectstart",D),r.addEventListener("selectend",D),r.addEventListener("squeeze",D),r.addEventListener("squeezestart",D),r.addEventListener("squeezeend",D),r.addEventListener("end",V),r.addEventListener("inputsourceschange",z),m.xrCompatible!==!0&&await n.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(b),r.renderState.layers===void 0){const ne={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};p=new XRWebGLLayer(r,n,ne),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),v=new $n(p.framebufferWidth,p.framebufferHeight,{format:ti,type:ar,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let ne=null,he=null,ae=null;m.depth&&(ae=m.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,ne=m.stencil?Jo:bs,he=m.stencil?aa:Hs);const He={colorFormat:n.RGBA8,depthFormat:ae,scaleFactor:s};d=new XRWebGLBinding(r,n),h=d.createProjectionLayer(He),r.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),v=new $n(h.textureWidth,h.textureHeight,{format:ti,type:ar,depthTexture:new Zv(h.textureWidth,h.textureHeight,he,void 0,void 0,void 0,void 0,void 0,void 0,ne),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),be.setContext(r),be.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function z(K){for(let ne=0;ne<K.removed.length;ne++){const he=K.removed[ne],ae=M.indexOf(he);ae>=0&&(M[ae]=null,_[ae].disconnect(he))}for(let ne=0;ne<K.added.length;ne++){const he=K.added[ne];let ae=M.indexOf(he);if(ae===-1){for(let Ne=0;Ne<_.length;Ne++)if(Ne>=M.length){M.push(he),ae=Ne;break}else if(M[Ne]===null){M[Ne]=he,ae=Ne;break}if(ae===-1)break}const He=_[ae];He&&He.connect(he)}}const O=new F,Z=new F;function I(K,ne,he){O.setFromMatrixPosition(ne.matrixWorld),Z.setFromMatrixPosition(he.matrixWorld);const ae=O.distanceTo(Z),He=ne.projectionMatrix.elements,Ne=he.projectionMatrix.elements,N=He[14]/(He[10]-1),xe=He[14]/(He[10]+1),oe=(He[9]+1)/He[5],Ve=(He[9]-1)/He[5],ge=(He[8]-1)/He[0],we=(Ne[8]+1)/Ne[0],Ce=N*ge,Pe=N*we,et=ae/(-ge+we),P=et*-ge;ne.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(P),K.translateZ(et),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert();const w=N+et,j=xe+et,Q=Ce-P,ie=Pe+(ae-P),re=oe*xe/j*w,Te=Ve*xe/j*w;K.projectionMatrix.makePerspective(Q,ie,re,Te,w,j),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}function G(K,ne){ne===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(ne.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(r===null)return;x.texture!==null&&(K.near=x.depthNear,K.far=x.depthFar),S.near=L.near=A.near=K.near,S.far=L.far=A.far=K.far,(U!==S.near||k!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),U=S.near,k=S.far,A.near=U,A.far=k,L.near=U,L.far=k,A.updateProjectionMatrix(),L.updateProjectionMatrix(),K.updateProjectionMatrix());const ne=K.parent,he=S.cameras;G(S,ne);for(let ae=0;ae<he.length;ae++)G(he[ae],ne);he.length===2?I(S,A,L):S.projectionMatrix.copy(A.projectionMatrix),X(K,S,ne)};function X(K,ne,he){he===null?K.matrix.copy(ne.matrixWorld):(K.matrix.copy(he.matrixWorld),K.matrix.invert(),K.matrix.multiply(ne.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(ne.projectionMatrix),K.projectionMatrixInverse.copy(ne.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=ea*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(h===null&&p===null))return l},this.setFoveation=function(K){l=K,h!==null&&(h.fixedFoveation=K),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=K)},this.hasDepthSensing=function(){return x.texture!==null};let ee=null;function ue(K,ne){if(f=ne.getViewerPose(c||o),g=ne,f!==null){const he=f.views;p!==null&&(e.setRenderTargetFramebuffer(v,p.framebuffer),e.setRenderTarget(v));let ae=!1;he.length!==S.cameras.length&&(S.cameras.length=0,ae=!0);for(let Ne=0;Ne<he.length;Ne++){const N=he[Ne];let xe=null;if(p!==null)xe=p.getViewport(N);else{const Ve=d.getViewSubImage(h,N);xe=Ve.viewport,Ne===0&&(e.setRenderTargetTextures(v,Ve.colorTexture,h.ignoreDepthValues?void 0:Ve.depthStencilTexture),e.setRenderTarget(v))}let oe=T[Ne];oe===void 0&&(oe=new Rn,oe.layers.enable(Ne),oe.viewport=new It,T[Ne]=oe),oe.matrix.fromArray(N.transform.matrix),oe.matrix.decompose(oe.position,oe.quaternion,oe.scale),oe.projectionMatrix.fromArray(N.projectionMatrix),oe.projectionMatrixInverse.copy(oe.projectionMatrix).invert(),oe.viewport.set(xe.x,xe.y,xe.width,xe.height),Ne===0&&(S.matrix.copy(oe.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),ae===!0&&S.cameras.push(oe)}const He=r.enabledFeatures;if(He&&He.includes("depth-sensing")){const Ne=d.getDepthInformation(he[0]);Ne&&Ne.isValid&&Ne.texture&&x.init(e,Ne,r.renderState)}}for(let he=0;he<_.length;he++){const ae=M[he],He=_[he];ae!==null&&He!==void 0&&He.update(ae,ne,c||o)}x.render(e,S),ee&&ee(K,ne),ne.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ne}),g=null}const be=new Kv;be.setAnimationLoop(ue),this.setAnimationLoop=function(K){ee=K},this.dispose=function(){}}}const _r=new si,FA=new ot;function OA(t,e){function n(m,u){m.matrixAutoUpdate===!0&&m.updateMatrix(),u.value.copy(m.matrix)}function i(m,u){u.color.getRGB(m.fogColor.value,$v(t)),u.isFog?(m.fogNear.value=u.near,m.fogFar.value=u.far):u.isFogExp2&&(m.fogDensity.value=u.density)}function r(m,u,v,_,M){u.isMeshBasicMaterial||u.isMeshLambertMaterial?s(m,u):u.isMeshToonMaterial?(s(m,u),d(m,u)):u.isMeshPhongMaterial?(s(m,u),f(m,u)):u.isMeshStandardMaterial?(s(m,u),h(m,u),u.isMeshPhysicalMaterial&&p(m,u,M)):u.isMeshMatcapMaterial?(s(m,u),g(m,u)):u.isMeshDepthMaterial?s(m,u):u.isMeshDistanceMaterial?(s(m,u),x(m,u)):u.isMeshNormalMaterial?s(m,u):u.isLineBasicMaterial?(o(m,u),u.isLineDashedMaterial&&a(m,u)):u.isPointsMaterial?l(m,u,v,_):u.isSpriteMaterial?c(m,u):u.isShadowMaterial?(m.color.value.copy(u.color),m.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function s(m,u){m.opacity.value=u.opacity,u.color&&m.diffuse.value.copy(u.color),u.emissive&&m.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(m.map.value=u.map,n(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.bumpMap&&(m.bumpMap.value=u.bumpMap,n(u.bumpMap,m.bumpMapTransform),m.bumpScale.value=u.bumpScale,u.side===ln&&(m.bumpScale.value*=-1)),u.normalMap&&(m.normalMap.value=u.normalMap,n(u.normalMap,m.normalMapTransform),m.normalScale.value.copy(u.normalScale),u.side===ln&&m.normalScale.value.negate()),u.displacementMap&&(m.displacementMap.value=u.displacementMap,n(u.displacementMap,m.displacementMapTransform),m.displacementScale.value=u.displacementScale,m.displacementBias.value=u.displacementBias),u.emissiveMap&&(m.emissiveMap.value=u.emissiveMap,n(u.emissiveMap,m.emissiveMapTransform)),u.specularMap&&(m.specularMap.value=u.specularMap,n(u.specularMap,m.specularMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest);const v=e.get(u),_=v.envMap,M=v.envMapRotation;if(_&&(m.envMap.value=_,_r.copy(M),_r.x*=-1,_r.y*=-1,_r.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(_r.y*=-1,_r.z*=-1),m.envMapRotation.value.setFromMatrix4(FA.makeRotationFromEuler(_r)),m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=u.reflectivity,m.ior.value=u.ior,m.refractionRatio.value=u.refractionRatio),u.lightMap){m.lightMap.value=u.lightMap;const b=t._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=u.lightMapIntensity*b,n(u.lightMap,m.lightMapTransform)}u.aoMap&&(m.aoMap.value=u.aoMap,m.aoMapIntensity.value=u.aoMapIntensity,n(u.aoMap,m.aoMapTransform))}function o(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,u.map&&(m.map.value=u.map,n(u.map,m.mapTransform))}function a(m,u){m.dashSize.value=u.dashSize,m.totalSize.value=u.dashSize+u.gapSize,m.scale.value=u.scale}function l(m,u,v,_){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.size.value=u.size*v,m.scale.value=_*.5,u.map&&(m.map.value=u.map,n(u.map,m.uvTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function c(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.rotation.value=u.rotation,u.map&&(m.map.value=u.map,n(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function f(m,u){m.specular.value.copy(u.specular),m.shininess.value=Math.max(u.shininess,1e-4)}function d(m,u){u.gradientMap&&(m.gradientMap.value=u.gradientMap)}function h(m,u){m.metalness.value=u.metalness,u.metalnessMap&&(m.metalnessMap.value=u.metalnessMap,n(u.metalnessMap,m.metalnessMapTransform)),m.roughness.value=u.roughness,u.roughnessMap&&(m.roughnessMap.value=u.roughnessMap,n(u.roughnessMap,m.roughnessMapTransform)),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)}function p(m,u,v){m.ior.value=u.ior,u.sheen>0&&(m.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),m.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(m.sheenColorMap.value=u.sheenColorMap,n(u.sheenColorMap,m.sheenColorMapTransform)),u.sheenRoughnessMap&&(m.sheenRoughnessMap.value=u.sheenRoughnessMap,n(u.sheenRoughnessMap,m.sheenRoughnessMapTransform))),u.clearcoat>0&&(m.clearcoat.value=u.clearcoat,m.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(m.clearcoatMap.value=u.clearcoatMap,n(u.clearcoatMap,m.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,n(u.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(m.clearcoatNormalMap.value=u.clearcoatNormalMap,n(u.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===ln&&m.clearcoatNormalScale.value.negate())),u.dispersion>0&&(m.dispersion.value=u.dispersion),u.iridescence>0&&(m.iridescence.value=u.iridescence,m.iridescenceIOR.value=u.iridescenceIOR,m.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(m.iridescenceMap.value=u.iridescenceMap,n(u.iridescenceMap,m.iridescenceMapTransform)),u.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=u.iridescenceThicknessMap,n(u.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),u.transmission>0&&(m.transmission.value=u.transmission,m.transmissionSamplerMap.value=v.texture,m.transmissionSamplerSize.value.set(v.width,v.height),u.transmissionMap&&(m.transmissionMap.value=u.transmissionMap,n(u.transmissionMap,m.transmissionMapTransform)),m.thickness.value=u.thickness,u.thicknessMap&&(m.thicknessMap.value=u.thicknessMap,n(u.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=u.attenuationDistance,m.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(m.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(m.anisotropyMap.value=u.anisotropyMap,n(u.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=u.specularIntensity,m.specularColor.value.copy(u.specularColor),u.specularColorMap&&(m.specularColorMap.value=u.specularColorMap,n(u.specularColorMap,m.specularColorMapTransform)),u.specularIntensityMap&&(m.specularIntensityMap.value=u.specularIntensityMap,n(u.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,u){u.matcap&&(m.matcap.value=u.matcap)}function x(m,u){const v=e.get(u).light;m.referencePosition.value.setFromMatrixPosition(v.matrixWorld),m.nearDistance.value=v.shadow.camera.near,m.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function kA(t,e,n,i){let r={},s={},o=[];const a=t.getParameter(t.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,_){const M=_.program;i.uniformBlockBinding(v,M)}function c(v,_){let M=r[v.id];M===void 0&&(g(v),M=f(v),r[v.id]=M,v.addEventListener("dispose",m));const b=_.program;i.updateUBOMapping(v,b);const C=e.render.frame;s[v.id]!==C&&(h(v),s[v.id]=C)}function f(v){const _=d();v.__bindingPointIndex=_;const M=t.createBuffer(),b=v.__size,C=v.usage;return t.bindBuffer(t.UNIFORM_BUFFER,M),t.bufferData(t.UNIFORM_BUFFER,b,C),t.bindBuffer(t.UNIFORM_BUFFER,null),t.bindBufferBase(t.UNIFORM_BUFFER,_,M),M}function d(){for(let v=0;v<a;v++)if(o.indexOf(v)===-1)return o.push(v),v;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(v){const _=r[v.id],M=v.uniforms,b=v.__cache;t.bindBuffer(t.UNIFORM_BUFFER,_);for(let C=0,A=M.length;C<A;C++){const L=Array.isArray(M[C])?M[C]:[M[C]];for(let T=0,S=L.length;T<S;T++){const U=L[T];if(p(U,C,T,b)===!0){const k=U.__offset,D=Array.isArray(U.value)?U.value:[U.value];let V=0;for(let z=0;z<D.length;z++){const O=D[z],Z=x(O);typeof O=="number"||typeof O=="boolean"?(U.__data[0]=O,t.bufferSubData(t.UNIFORM_BUFFER,k+V,U.__data)):O.isMatrix3?(U.__data[0]=O.elements[0],U.__data[1]=O.elements[1],U.__data[2]=O.elements[2],U.__data[3]=0,U.__data[4]=O.elements[3],U.__data[5]=O.elements[4],U.__data[6]=O.elements[5],U.__data[7]=0,U.__data[8]=O.elements[6],U.__data[9]=O.elements[7],U.__data[10]=O.elements[8],U.__data[11]=0):(O.toArray(U.__data,V),V+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}t.bufferSubData(t.UNIFORM_BUFFER,k,U.__data)}}}t.bindBuffer(t.UNIFORM_BUFFER,null)}function p(v,_,M,b){const C=v.value,A=_+"_"+M;if(b[A]===void 0)return typeof C=="number"||typeof C=="boolean"?b[A]=C:b[A]=C.clone(),!0;{const L=b[A];if(typeof C=="number"||typeof C=="boolean"){if(L!==C)return b[A]=C,!0}else if(L.equals(C)===!1)return L.copy(C),!0}return!1}function g(v){const _=v.uniforms;let M=0;const b=16;for(let A=0,L=_.length;A<L;A++){const T=Array.isArray(_[A])?_[A]:[_[A]];for(let S=0,U=T.length;S<U;S++){const k=T[S],D=Array.isArray(k.value)?k.value:[k.value];for(let V=0,z=D.length;V<z;V++){const O=D[V],Z=x(O),I=M%b;I!==0&&b-I<Z.boundary&&(M+=b-I),k.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),k.__offset=M,M+=Z.storage}}}const C=M%b;return C>0&&(M+=b-C),v.__size=M,v.__cache={},this}function x(v){const _={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(_.boundary=4,_.storage=4):v.isVector2?(_.boundary=8,_.storage=8):v.isVector3||v.isColor?(_.boundary=16,_.storage=12):v.isVector4?(_.boundary=16,_.storage=16):v.isMatrix3?(_.boundary=48,_.storage=48):v.isMatrix4?(_.boundary=64,_.storage=64):v.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",v),_}function m(v){const _=v.target;_.removeEventListener("dispose",m);const M=o.indexOf(_.__bindingPointIndex);o.splice(M,1),t.deleteBuffer(r[_.id]),delete r[_.id],delete s[_.id]}function u(){for(const v in r)t.deleteBuffer(r[v]);o=[],r={},s={}}return{bind:l,update:c,dispose:u}}class zA{constructor(e={}){const{canvas:n=NM(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:f="default",failIfMajorPerformanceCaveat:d=!1}=e;this.isWebGLRenderer=!0;let h;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");h=i.getContextAttributes().alpha}else h=o;const p=new Uint32Array(4),g=new Int32Array(4);let x=null,m=null;const u=[],v=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Vn,this._useLegacyLights=!1,this.toneMapping=nr,this.toneMappingExposure=1;const _=this;let M=!1,b=0,C=0,A=null,L=-1,T=null;const S=new It,U=new It;let k=null;const D=new Ge(0);let V=0,z=n.width,O=n.height,Z=1,I=null,G=null;const X=new It(0,0,z,O),ee=new It(0,0,z,O);let ue=!1;const be=new Df;let K=!1,ne=!1;const he=new ot,ae=new F,He={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ne(){return A===null?Z:1}let N=i;function xe(R,H){return n.getContext(R,H)}try{const R={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:f,failIfMajorPerformanceCaveat:d};if("setAttribute"in n&&n.setAttribute("data-engine",`three.js r${Rf}`),n.addEventListener("webglcontextlost",E,!1),n.addEventListener("webglcontextrestored",B,!1),n.addEventListener("webglcontextcreationerror",W,!1),N===null){const H="webgl2";if(N=xe(H,R),N===null)throw xe(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let oe,Ve,ge,we,Ce,Pe,et,P,w,j,Q,ie,re,Te,pe,fe,Le,ce,Ee,Ye,Ae,_e,Ue,je;function it(){oe=new $T(N),oe.init(),_e=new bA(N,oe),Ve=new HT(N,oe,e,_e),ge=new CA(N),we=new KT(N),Ce=new hA,Pe=new RA(N,oe,ge,Ce,Ve,_e,we),et=new GT(_),P=new XT(_),w=new iE(N),Ue=new zT(N,w),j=new YT(N,w,we,Ue),Q=new QT(N,j,w,we),Ee=new ZT(N,Ve,Pe),fe=new VT(Ce),ie=new fA(_,et,P,oe,Ve,Ue,fe),re=new OA(_,Ce),Te=new mA,pe=new SA(oe),ce=new kT(_,et,P,ge,Q,h,l),Le=new AA(_,Q,Ve),je=new kA(N,we,Ve,ge),Ye=new BT(N,oe,we),Ae=new qT(N,oe,we),we.programs=ie.programs,_.capabilities=Ve,_.extensions=oe,_.properties=Ce,_.renderLists=Te,_.shadowMap=Le,_.state=ge,_.info=we}it();const Oe=new UA(_,N);this.xr=Oe,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){const R=oe.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=oe.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return Z},this.setPixelRatio=function(R){R!==void 0&&(Z=R,this.setSize(z,O,!1))},this.getSize=function(R){return R.set(z,O)},this.setSize=function(R,H,q=!0){if(Oe.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}z=R,O=H,n.width=Math.floor(R*Z),n.height=Math.floor(H*Z),q===!0&&(n.style.width=R+"px",n.style.height=H+"px"),this.setViewport(0,0,R,H)},this.getDrawingBufferSize=function(R){return R.set(z*Z,O*Z).floor()},this.setDrawingBufferSize=function(R,H,q){z=R,O=H,Z=q,n.width=Math.floor(R*q),n.height=Math.floor(H*q),this.setViewport(0,0,R,H)},this.getCurrentViewport=function(R){return R.copy(S)},this.getViewport=function(R){return R.copy(X)},this.setViewport=function(R,H,q,$){R.isVector4?X.set(R.x,R.y,R.z,R.w):X.set(R,H,q,$),ge.viewport(S.copy(X).multiplyScalar(Z).round())},this.getScissor=function(R){return R.copy(ee)},this.setScissor=function(R,H,q,$){R.isVector4?ee.set(R.x,R.y,R.z,R.w):ee.set(R,H,q,$),ge.scissor(U.copy(ee).multiplyScalar(Z).round())},this.getScissorTest=function(){return ue},this.setScissorTest=function(R){ge.setScissorTest(ue=R)},this.setOpaqueSort=function(R){I=R},this.setTransparentSort=function(R){G=R},this.getClearColor=function(R){return R.copy(ce.getClearColor())},this.setClearColor=function(){ce.setClearColor.apply(ce,arguments)},this.getClearAlpha=function(){return ce.getClearAlpha()},this.setClearAlpha=function(){ce.setClearAlpha.apply(ce,arguments)},this.clear=function(R=!0,H=!0,q=!0){let $=0;if(R){let Y=!1;if(A!==null){const me=A.texture.format;Y=me===Ov||me===Fv||me===Uv}if(Y){const me=A.texture.type,Se=me===ar||me===Hs||me===Lv||me===aa||me===Dv||me===Iv,Me=ce.getClearColor(),Re=ce.getClearAlpha(),De=Me.r,ke=Me.g,Xe=Me.b;Se?(p[0]=De,p[1]=ke,p[2]=Xe,p[3]=Re,N.clearBufferuiv(N.COLOR,0,p)):(g[0]=De,g[1]=ke,g[2]=Xe,g[3]=Re,N.clearBufferiv(N.COLOR,0,g))}else $|=N.COLOR_BUFFER_BIT}H&&($|=N.DEPTH_BUFFER_BIT),q&&($|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),N.clear($)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",E,!1),n.removeEventListener("webglcontextrestored",B,!1),n.removeEventListener("webglcontextcreationerror",W,!1),Te.dispose(),pe.dispose(),Ce.dispose(),et.dispose(),P.dispose(),Q.dispose(),Ue.dispose(),je.dispose(),ie.dispose(),Oe.dispose(),Oe.removeEventListener("sessionstart",Ze),Oe.removeEventListener("sessionend",yt),at.stop()};function E(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function B(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;const R=we.autoReset,H=Le.enabled,q=Le.autoUpdate,$=Le.needsUpdate,Y=Le.type;it(),we.autoReset=R,Le.enabled=H,Le.autoUpdate=q,Le.needsUpdate=$,Le.type=Y}function W(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function te(R){const H=R.target;H.removeEventListener("dispose",te),le(H)}function le(R){Fe(R),Ce.remove(R)}function Fe(R){const H=Ce.get(R).programs;H!==void 0&&(H.forEach(function(q){ie.releaseProgram(q)}),R.isShaderMaterial&&ie.releaseShaderCache(R))}this.renderBufferDirect=function(R,H,q,$,Y,me){H===null&&(H=He);const Se=Y.isMesh&&Y.matrixWorld.determinant()<0,Me=l_(R,H,q,$,Y);ge.setMaterial($,Se);let Re=q.index,De=1;if($.wireframe===!0){if(Re=j.getWireframeAttribute(q),Re===void 0)return;De=2}const ke=q.drawRange,Xe=q.attributes.position;let St=ke.start*De,zt=(ke.start+ke.count)*De;me!==null&&(St=Math.max(St,me.start*De),zt=Math.min(zt,(me.start+me.count)*De)),Re!==null?(St=Math.max(St,0),zt=Math.min(zt,Re.count)):Xe!=null&&(St=Math.max(St,0),zt=Math.min(zt,Xe.count));const un=zt-St;if(un<0||un===1/0)return;Ue.setup(Y,$,Me,q,Re);let ai,Je=Ye;if(Re!==null&&(ai=w.get(Re),Je=Ae,Je.setIndex(ai)),Y.isMesh)$.wireframe===!0?(ge.setLineWidth($.wireframeLinewidth*Ne()),Je.setMode(N.LINES)):Je.setMode(N.TRIANGLES);else if(Y.isLine){let Ie=$.linewidth;Ie===void 0&&(Ie=1),ge.setLineWidth(Ie*Ne()),Y.isLineSegments?Je.setMode(N.LINES):Y.isLineLoop?Je.setMode(N.LINE_LOOP):Je.setMode(N.LINE_STRIP)}else Y.isPoints?Je.setMode(N.POINTS):Y.isSprite&&Je.setMode(N.TRIANGLES);if(Y.isBatchedMesh)Y._multiDrawInstances!==null?Je.renderMultiDrawInstances(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount,Y._multiDrawInstances):Je.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else if(Y.isInstancedMesh)Je.renderInstances(St,un,Y.count);else if(q.isInstancedBufferGeometry){const Ie=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,Js=Math.min(q.instanceCount,Ie);Je.renderInstances(St,un,Js)}else Je.render(St,un)};function We(R,H,q){R.transparent===!0&&R.side===Jn&&R.forceSinglePass===!1?(R.side=ln,R.needsUpdate=!0,la(R,H,q),R.side=or,R.needsUpdate=!0,la(R,H,q),R.side=Jn):la(R,H,q)}this.compile=function(R,H,q=null){q===null&&(q=R),m=pe.get(q),m.init(H),v.push(m),q.traverseVisible(function(Y){Y.isLight&&Y.layers.test(H.layers)&&(m.pushLight(Y),Y.castShadow&&m.pushShadow(Y))}),R!==q&&R.traverseVisible(function(Y){Y.isLight&&Y.layers.test(H.layers)&&(m.pushLight(Y),Y.castShadow&&m.pushShadow(Y))}),m.setupLights(_._useLegacyLights);const $=new Set;return R.traverse(function(Y){const me=Y.material;if(me)if(Array.isArray(me))for(let Se=0;Se<me.length;Se++){const Me=me[Se];We(Me,q,Y),$.add(Me)}else We(me,q,Y),$.add(me)}),v.pop(),m=null,$},this.compileAsync=function(R,H,q=null){const $=this.compile(R,H,q);return new Promise(Y=>{function me(){if($.forEach(function(Se){Ce.get(Se).currentProgram.isReady()&&$.delete(Se)}),$.size===0){Y(R);return}setTimeout(me,10)}oe.get("KHR_parallel_shader_compile")!==null?me():setTimeout(me,10)})};let ft=null;function bt(R){ft&&ft(R)}function Ze(){at.stop()}function yt(){at.start()}const at=new Kv;at.setAnimationLoop(bt),typeof self<"u"&&at.setContext(self),this.setAnimationLoop=function(R){ft=R,Oe.setAnimationLoop(R),R===null?at.stop():at.start()},Oe.addEventListener("sessionstart",Ze),Oe.addEventListener("sessionend",yt),this.render=function(R,H){if(H!==void 0&&H.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),Oe.enabled===!0&&Oe.isPresenting===!0&&(Oe.cameraAutoUpdate===!0&&Oe.updateCamera(H),H=Oe.getCamera()),R.isScene===!0&&R.onBeforeRender(_,R,H,A),m=pe.get(R,v.length),m.init(H),v.push(m),he.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),be.setFromProjectionMatrix(he),ne=this.localClippingEnabled,K=fe.init(this.clippingPlanes,ne),x=Te.get(R,u.length),x.init(),u.push(x),Ri(R,H,0,_.sortObjects),x.finish(),_.sortObjects===!0&&x.sort(I,G);const q=Oe.enabled===!1||Oe.isPresenting===!1||Oe.hasDepthSensing()===!1;q&&ce.addToRenderList(x,R),this.info.render.frame++,K===!0&&fe.beginShadows();const $=m.state.shadowsArray;Le.render($,R,H),K===!0&&fe.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=x.opaque,me=x.transmissive;if(m.setupLights(_._useLegacyLights),H.isArrayCamera){const Se=H.cameras;if(me.length>0)for(let Me=0,Re=Se.length;Me<Re;Me++){const De=Se[Me];bi(Y,me,R,De)}q&&ce.render(R);for(let Me=0,Re=Se.length;Me<Re;Me++){const De=Se[Me];Mn(x,R,De,De.viewport)}}else me.length>0&&bi(Y,me,R,H),q&&ce.render(R),Mn(x,R,H);A!==null&&(Pe.updateMultisampleRenderTarget(A),Pe.updateRenderTargetMipmap(A)),R.isScene===!0&&R.onAfterRender(_,R,H),Ue.resetDefaultState(),L=-1,T=null,v.pop(),v.length>0?(m=v[v.length-1],K===!0&&fe.setGlobalState(_.clippingPlanes,m.state.camera)):m=null,u.pop(),u.length>0?x=u[u.length-1]:x=null};function Ri(R,H,q,$){if(R.visible===!1)return;if(R.layers.test(H.layers)){if(R.isGroup)q=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(H);else if(R.isLight)m.pushLight(R),R.castShadow&&m.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||be.intersectsSprite(R)){$&&ae.setFromMatrixPosition(R.matrixWorld).applyMatrix4(he);const Se=Q.update(R),Me=R.material;Me.visible&&x.push(R,Se,Me,q,ae.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||be.intersectsObject(R))){const Se=Q.update(R),Me=R.material;if($&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),ae.copy(R.boundingSphere.center)):(Se.boundingSphere===null&&Se.computeBoundingSphere(),ae.copy(Se.boundingSphere.center)),ae.applyMatrix4(R.matrixWorld).applyMatrix4(he)),Array.isArray(Me)){const Re=Se.groups;for(let De=0,ke=Re.length;De<ke;De++){const Xe=Re[De],St=Me[Xe.materialIndex];St&&St.visible&&x.push(R,Se,St,q,ae.z,Xe)}}else Me.visible&&x.push(R,Se,Me,q,ae.z,null)}}const me=R.children;for(let Se=0,Me=me.length;Se<Me;Se++)Ri(me[Se],H,q,$)}function Mn(R,H,q,$){const Y=R.opaque,me=R.transmissive,Se=R.transparent;m.setupLightsView(q),K===!0&&fe.setGlobalState(_.clippingPlanes,q),$&&ge.viewport(S.copy($)),Y.length>0&&oi(Y,H,q),me.length>0&&oi(me,H,q),Se.length>0&&oi(Se,H,q),ge.buffers.depth.setTest(!0),ge.buffers.depth.setMask(!0),ge.buffers.color.setMask(!0),ge.setPolygonOffset(!1)}function bi(R,H,q,$){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[$.id]===void 0&&(m.state.transmissionRenderTarget[$.id]=new $n(1,1,{generateMipmaps:!0,type:oe.has("EXT_color_buffer_half_float")||oe.has("EXT_color_buffer_float")?ir:ar,minFilter:Rr,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1}));const me=m.state.transmissionRenderTarget[$.id],Se=$.viewport||S;me.setSize(Se.z,Se.w);const Me=_.getRenderTarget();_.setRenderTarget(me),_.getClearColor(D),V=_.getClearAlpha(),V<1&&_.setClearColor(16777215,.5),_.clear();const Re=_.toneMapping;_.toneMapping=nr;const De=$.viewport;if($.viewport!==void 0&&($.viewport=void 0),m.setupLightsView($),K===!0&&fe.setGlobalState(_.clippingPlanes,$),oi(R,q,$),Pe.updateMultisampleRenderTarget(me),Pe.updateRenderTargetMipmap(me),oe.has("WEBGL_multisampled_render_to_texture")===!1){let ke=!1;for(let Xe=0,St=H.length;Xe<St;Xe++){const zt=H[Xe],un=zt.object,ai=zt.geometry,Je=zt.material,Ie=zt.group;if(Je.side===Jn&&un.layers.test($.layers)){const Js=Je.side;Je.side=ln,Je.needsUpdate=!0,Qs(un,q,$,ai,Je,Ie),Je.side=Js,Je.needsUpdate=!0,ke=!0}}ke===!0&&(Pe.updateMultisampleRenderTarget(me),Pe.updateRenderTargetMipmap(me))}_.setRenderTarget(Me),_.setClearColor(D,V),De!==void 0&&($.viewport=De),_.toneMapping=Re}function oi(R,H,q){const $=H.isScene===!0?H.overrideMaterial:null;for(let Y=0,me=R.length;Y<me;Y++){const Se=R[Y],Me=Se.object,Re=Se.geometry,De=$===null?Se.material:$,ke=Se.group;Me.layers.test(q.layers)&&Qs(Me,H,q,Re,De,ke)}}function Qs(R,H,q,$,Y,me){R.onBeforeRender(_,H,q,$,Y,me),R.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),Y.onBeforeRender(_,H,q,$,R,me),Y.transparent===!0&&Y.side===Jn&&Y.forceSinglePass===!1?(Y.side=ln,Y.needsUpdate=!0,_.renderBufferDirect(q,H,$,Y,R,me),Y.side=or,Y.needsUpdate=!0,_.renderBufferDirect(q,H,$,Y,R,me),Y.side=Jn):_.renderBufferDirect(q,H,$,Y,R,me),R.onAfterRender(_,H,q,$,Y,me)}function la(R,H,q){H.isScene!==!0&&(H=He);const $=Ce.get(R),Y=m.state.lights,me=m.state.shadowsArray,Se=Y.state.version,Me=ie.getParameters(R,Y.state,me,H,q),Re=ie.getProgramCacheKey(Me);let De=$.programs;$.environment=R.isMeshStandardMaterial?H.environment:null,$.fog=H.fog,$.envMap=(R.isMeshStandardMaterial?P:et).get(R.envMap||$.environment),$.envMapRotation=$.environment!==null&&R.envMap===null?H.environmentRotation:R.envMapRotation,De===void 0&&(R.addEventListener("dispose",te),De=new Map,$.programs=De);let ke=De.get(Re);if(ke!==void 0){if($.currentProgram===ke&&$.lightsStateVersion===Se)return Bf(R,Me),ke}else Me.uniforms=ie.getUniforms(R),R.onBuild(q,Me,_),R.onBeforeCompile(Me,_),ke=ie.acquireProgram(Me,Re),De.set(Re,ke),$.uniforms=Me.uniforms;const Xe=$.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Xe.clippingPlanes=fe.uniform),Bf(R,Me),$.needsLights=u_(R),$.lightsStateVersion=Se,$.needsLights&&(Xe.ambientLightColor.value=Y.state.ambient,Xe.lightProbe.value=Y.state.probe,Xe.directionalLights.value=Y.state.directional,Xe.directionalLightShadows.value=Y.state.directionalShadow,Xe.spotLights.value=Y.state.spot,Xe.spotLightShadows.value=Y.state.spotShadow,Xe.rectAreaLights.value=Y.state.rectArea,Xe.ltc_1.value=Y.state.rectAreaLTC1,Xe.ltc_2.value=Y.state.rectAreaLTC2,Xe.pointLights.value=Y.state.point,Xe.pointLightShadows.value=Y.state.pointShadow,Xe.hemisphereLights.value=Y.state.hemi,Xe.directionalShadowMap.value=Y.state.directionalShadowMap,Xe.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,Xe.spotShadowMap.value=Y.state.spotShadowMap,Xe.spotLightMatrix.value=Y.state.spotLightMatrix,Xe.spotLightMap.value=Y.state.spotLightMap,Xe.pointShadowMap.value=Y.state.pointShadowMap,Xe.pointShadowMatrix.value=Y.state.pointShadowMatrix),$.currentProgram=ke,$.uniformsList=null,ke}function zf(R){if(R.uniformsList===null){const H=R.currentProgram.getUniforms();R.uniformsList=dl.seqWithValue(H.seq,R.uniforms)}return R.uniformsList}function Bf(R,H){const q=Ce.get(R);q.outputColorSpace=H.outputColorSpace,q.batching=H.batching,q.instancing=H.instancing,q.instancingColor=H.instancingColor,q.instancingMorph=H.instancingMorph,q.skinning=H.skinning,q.morphTargets=H.morphTargets,q.morphNormals=H.morphNormals,q.morphColors=H.morphColors,q.morphTargetsCount=H.morphTargetsCount,q.numClippingPlanes=H.numClippingPlanes,q.numIntersection=H.numClipIntersection,q.vertexAlphas=H.vertexAlphas,q.vertexTangents=H.vertexTangents,q.toneMapping=H.toneMapping}function l_(R,H,q,$,Y){H.isScene!==!0&&(H=He),Pe.resetTextureUnits();const me=H.fog,Se=$.isMeshStandardMaterial?H.environment:null,Me=A===null?_.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:dr,Re=($.isMeshStandardMaterial?P:et).get($.envMap||Se),De=$.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,ke=!!q.attributes.tangent&&(!!$.normalMap||$.anisotropy>0),Xe=!!q.morphAttributes.position,St=!!q.morphAttributes.normal,zt=!!q.morphAttributes.color;let un=nr;$.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(un=_.toneMapping);const ai=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,Je=ai!==void 0?ai.length:0,Ie=Ce.get($),Js=m.state.lights;if(K===!0&&(ne===!0||R!==T)){const En=R===T&&$.id===L;fe.setState($,R,En)}let ut=!1;$.version===Ie.__version?(Ie.needsLights&&Ie.lightsStateVersion!==Js.state.version||Ie.outputColorSpace!==Me||Y.isBatchedMesh&&Ie.batching===!1||!Y.isBatchedMesh&&Ie.batching===!0||Y.isInstancedMesh&&Ie.instancing===!1||!Y.isInstancedMesh&&Ie.instancing===!0||Y.isSkinnedMesh&&Ie.skinning===!1||!Y.isSkinnedMesh&&Ie.skinning===!0||Y.isInstancedMesh&&Ie.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&Ie.instancingColor===!1&&Y.instanceColor!==null||Y.isInstancedMesh&&Ie.instancingMorph===!0&&Y.morphTexture===null||Y.isInstancedMesh&&Ie.instancingMorph===!1&&Y.morphTexture!==null||Ie.envMap!==Re||$.fog===!0&&Ie.fog!==me||Ie.numClippingPlanes!==void 0&&(Ie.numClippingPlanes!==fe.numPlanes||Ie.numIntersection!==fe.numIntersection)||Ie.vertexAlphas!==De||Ie.vertexTangents!==ke||Ie.morphTargets!==Xe||Ie.morphNormals!==St||Ie.morphColors!==zt||Ie.toneMapping!==un||Ie.morphTargetsCount!==Je)&&(ut=!0):(ut=!0,Ie.__version=$.version);let fr=Ie.currentProgram;ut===!0&&(fr=la($,H,Y));let Hf=!1,eo=!1,gc=!1;const Bt=fr.getUniforms(),Pi=Ie.uniforms;if(ge.useProgram(fr.program)&&(Hf=!0,eo=!0,gc=!0),$.id!==L&&(L=$.id,eo=!0),Hf||T!==R){Bt.setValue(N,"projectionMatrix",R.projectionMatrix),Bt.setValue(N,"viewMatrix",R.matrixWorldInverse);const En=Bt.map.cameraPosition;En!==void 0&&En.setValue(N,ae.setFromMatrixPosition(R.matrixWorld)),Ve.logarithmicDepthBuffer&&Bt.setValue(N,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),($.isMeshPhongMaterial||$.isMeshToonMaterial||$.isMeshLambertMaterial||$.isMeshBasicMaterial||$.isMeshStandardMaterial||$.isShaderMaterial)&&Bt.setValue(N,"isOrthographic",R.isOrthographicCamera===!0),T!==R&&(T=R,eo=!0,gc=!0)}if(Y.isSkinnedMesh){Bt.setOptional(N,Y,"bindMatrix"),Bt.setOptional(N,Y,"bindMatrixInverse");const En=Y.skeleton;En&&(En.boneTexture===null&&En.computeBoneTexture(),Bt.setValue(N,"boneTexture",En.boneTexture,Pe))}Y.isBatchedMesh&&(Bt.setOptional(N,Y,"batchingTexture"),Bt.setValue(N,"batchingTexture",Y._matricesTexture,Pe));const vc=q.morphAttributes;if((vc.position!==void 0||vc.normal!==void 0||vc.color!==void 0)&&Ee.update(Y,q,fr),(eo||Ie.receiveShadow!==Y.receiveShadow)&&(Ie.receiveShadow=Y.receiveShadow,Bt.setValue(N,"receiveShadow",Y.receiveShadow)),$.isMeshGouraudMaterial&&$.envMap!==null&&(Pi.envMap.value=Re,Pi.flipEnvMap.value=Re.isCubeTexture&&Re.isRenderTargetTexture===!1?-1:1),$.isMeshStandardMaterial&&$.envMap===null&&H.environment!==null&&(Pi.envMapIntensity.value=H.environmentIntensity),eo&&(Bt.setValue(N,"toneMappingExposure",_.toneMappingExposure),Ie.needsLights&&c_(Pi,gc),me&&$.fog===!0&&re.refreshFogUniforms(Pi,me),re.refreshMaterialUniforms(Pi,$,Z,O,m.state.transmissionRenderTarget[R.id]),dl.upload(N,zf(Ie),Pi,Pe)),$.isShaderMaterial&&$.uniformsNeedUpdate===!0&&(dl.upload(N,zf(Ie),Pi,Pe),$.uniformsNeedUpdate=!1),$.isSpriteMaterial&&Bt.setValue(N,"center",Y.center),Bt.setValue(N,"modelViewMatrix",Y.modelViewMatrix),Bt.setValue(N,"normalMatrix",Y.normalMatrix),Bt.setValue(N,"modelMatrix",Y.matrixWorld),$.isShaderMaterial||$.isRawShaderMaterial){const En=$.uniformsGroups;for(let _c=0,d_=En.length;_c<d_;_c++){const Vf=En[_c];je.update(Vf,fr),je.bind(Vf,fr)}}return fr}function c_(R,H){R.ambientLightColor.needsUpdate=H,R.lightProbe.needsUpdate=H,R.directionalLights.needsUpdate=H,R.directionalLightShadows.needsUpdate=H,R.pointLights.needsUpdate=H,R.pointLightShadows.needsUpdate=H,R.spotLights.needsUpdate=H,R.spotLightShadows.needsUpdate=H,R.rectAreaLights.needsUpdate=H,R.hemisphereLights.needsUpdate=H}function u_(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return b},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(R,H,q){Ce.get(R.texture).__webglTexture=H,Ce.get(R.depthTexture).__webglTexture=q;const $=Ce.get(R);$.__hasExternalTextures=!0,$.__autoAllocateDepthBuffer=q===void 0,$.__autoAllocateDepthBuffer||oe.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),$.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(R,H){const q=Ce.get(R);q.__webglFramebuffer=H,q.__useDefaultFramebuffer=H===void 0},this.setRenderTarget=function(R,H=0,q=0){A=R,b=H,C=q;let $=!0,Y=null,me=!1,Se=!1;if(R){const Re=Ce.get(R);Re.__useDefaultFramebuffer!==void 0?(ge.bindFramebuffer(N.FRAMEBUFFER,null),$=!1):Re.__webglFramebuffer===void 0?Pe.setupRenderTarget(R):Re.__hasExternalTextures&&Pe.rebindTextures(R,Ce.get(R.texture).__webglTexture,Ce.get(R.depthTexture).__webglTexture);const De=R.texture;(De.isData3DTexture||De.isDataArrayTexture||De.isCompressedArrayTexture)&&(Se=!0);const ke=Ce.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(ke[H])?Y=ke[H][q]:Y=ke[H],me=!0):R.samples>0&&Pe.useMultisampledRTT(R)===!1?Y=Ce.get(R).__webglMultisampledFramebuffer:Array.isArray(ke)?Y=ke[q]:Y=ke,S.copy(R.viewport),U.copy(R.scissor),k=R.scissorTest}else S.copy(X).multiplyScalar(Z).floor(),U.copy(ee).multiplyScalar(Z).floor(),k=ue;if(ge.bindFramebuffer(N.FRAMEBUFFER,Y)&&$&&ge.drawBuffers(R,Y),ge.viewport(S),ge.scissor(U),ge.setScissorTest(k),me){const Re=Ce.get(R.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+H,Re.__webglTexture,q)}else if(Se){const Re=Ce.get(R.texture),De=H||0;N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,Re.__webglTexture,q||0,De)}L=-1},this.readRenderTargetPixels=function(R,H,q,$,Y,me,Se){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=Ce.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Se!==void 0&&(Me=Me[Se]),Me){ge.bindFramebuffer(N.FRAMEBUFFER,Me);try{const Re=R.texture,De=Re.format,ke=Re.type;if(!Ve.textureFormatReadable(De)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ve.textureTypeReadable(ke)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=R.width-$&&q>=0&&q<=R.height-Y&&N.readPixels(H,q,$,Y,_e.convert(De),_e.convert(ke),me)}finally{const Re=A!==null?Ce.get(A).__webglFramebuffer:null;ge.bindFramebuffer(N.FRAMEBUFFER,Re)}}},this.copyFramebufferToTexture=function(R,H,q=0){const $=Math.pow(2,-q),Y=Math.floor(H.image.width*$),me=Math.floor(H.image.height*$);Pe.setTexture2D(H,0),N.copyTexSubImage2D(N.TEXTURE_2D,q,0,0,R.x,R.y,Y,me),ge.unbindTexture()},this.copyTextureToTexture=function(R,H,q,$=0){const Y=H.image.width,me=H.image.height,Se=_e.convert(q.format),Me=_e.convert(q.type);Pe.setTexture2D(q,0),N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,q.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,q.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,q.unpackAlignment),H.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,$,R.x,R.y,Y,me,Se,Me,H.image.data):H.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,$,R.x,R.y,H.mipmaps[0].width,H.mipmaps[0].height,Se,H.mipmaps[0].data):N.texSubImage2D(N.TEXTURE_2D,$,R.x,R.y,Se,Me,H.image),$===0&&q.generateMipmaps&&N.generateMipmap(N.TEXTURE_2D),ge.unbindTexture()},this.copyTextureToTexture3D=function(R,H,q,$,Y=0){const me=R.max.x-R.min.x,Se=R.max.y-R.min.y,Me=R.max.z-R.min.z,Re=_e.convert($.format),De=_e.convert($.type);let ke;if($.isData3DTexture)Pe.setTexture3D($,0),ke=N.TEXTURE_3D;else if($.isDataArrayTexture||$.isCompressedArrayTexture)Pe.setTexture2DArray($,0),ke=N.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,$.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,$.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,$.unpackAlignment);const Xe=N.getParameter(N.UNPACK_ROW_LENGTH),St=N.getParameter(N.UNPACK_IMAGE_HEIGHT),zt=N.getParameter(N.UNPACK_SKIP_PIXELS),un=N.getParameter(N.UNPACK_SKIP_ROWS),ai=N.getParameter(N.UNPACK_SKIP_IMAGES),Je=q.isCompressedTexture?q.mipmaps[Y]:q.image;N.pixelStorei(N.UNPACK_ROW_LENGTH,Je.width),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Je.height),N.pixelStorei(N.UNPACK_SKIP_PIXELS,R.min.x),N.pixelStorei(N.UNPACK_SKIP_ROWS,R.min.y),N.pixelStorei(N.UNPACK_SKIP_IMAGES,R.min.z),q.isDataTexture||q.isData3DTexture?N.texSubImage3D(ke,Y,H.x,H.y,H.z,me,Se,Me,Re,De,Je.data):$.isCompressedArrayTexture?N.compressedTexSubImage3D(ke,Y,H.x,H.y,H.z,me,Se,Me,Re,Je.data):N.texSubImage3D(ke,Y,H.x,H.y,H.z,me,Se,Me,Re,De,Je),N.pixelStorei(N.UNPACK_ROW_LENGTH,Xe),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,St),N.pixelStorei(N.UNPACK_SKIP_PIXELS,zt),N.pixelStorei(N.UNPACK_SKIP_ROWS,un),N.pixelStorei(N.UNPACK_SKIP_IMAGES,ai),Y===0&&$.generateMipmaps&&N.generateMipmap(ke),ge.unbindTexture()},this.initTexture=function(R){R.isCubeTexture?Pe.setTextureCube(R,0):R.isData3DTexture?Pe.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?Pe.setTexture2DArray(R,0):Pe.setTexture2D(R,0),ge.unbindTexture()},this.resetState=function(){b=0,C=0,A=null,ge.reset(),Ue.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return xi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const n=this.getContext();n.drawingBufferColorSpace=e===Pf?"display-p3":"srgb",n.unpackColorSpace=tt.workingColorSpace===uc?"display-p3":"srgb"}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class BA extends At{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new si,this.environmentIntensity=1,this.environmentRotation=new si,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,n){return super.copy(e,n),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const n=super.toJSON(e);return this.fog!==null&&(n.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(n.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(n.object.backgroundIntensity=this.backgroundIntensity),n.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(n.object.environmentIntensity=this.environmentIntensity),n.object.environmentRotation=this.environmentRotation.toArray(),n}}class i_ extends Ys{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ge(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Gl=new F,jl=new F,wm=new ot,po=new fc,Ya=new dc,Eu=new F,Am=new F;class HA extends At{constructor(e=new Sn,n=new i_){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=n,this.updateMorphTargets()}copy(e,n){return super.copy(e,n),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const n=e.attributes.position,i=[0];for(let r=1,s=n.count;r<s;r++)Gl.fromBufferAttribute(n,r-1),jl.fromBufferAttribute(n,r),i[r]=i[r-1],i[r]+=Gl.distanceTo(jl);e.setAttribute("lineDistance",new vt(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,n){const i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ya.copy(i.boundingSphere),Ya.applyMatrix4(r),Ya.radius+=s,e.ray.intersectsSphere(Ya)===!1)return;wm.copy(r).invert(),po.copy(e.ray).applyMatrix4(wm);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,f=i.index,h=i.attributes.position;if(f!==null){const p=Math.max(0,o.start),g=Math.min(f.count,o.start+o.count);for(let x=p,m=g-1;x<m;x+=c){const u=f.getX(x),v=f.getX(x+1),_=qa(this,e,po,l,u,v);_&&n.push(_)}if(this.isLineLoop){const x=f.getX(g-1),m=f.getX(p),u=qa(this,e,po,l,x,m);u&&n.push(u)}}else{const p=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let x=p,m=g-1;x<m;x+=c){const u=qa(this,e,po,l,x,x+1);u&&n.push(u)}if(this.isLineLoop){const x=qa(this,e,po,l,g-1,p);x&&n.push(x)}}}updateMorphTargets(){const n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){const r=n[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function qa(t,e,n,i,r,s){const o=t.geometry.attributes.position;if(Gl.fromBufferAttribute(o,r),jl.fromBufferAttribute(o,s),n.distanceSqToSegment(Gl,jl,Eu,Am)>i)return;Eu.applyMatrix4(t.matrixWorld);const l=e.ray.origin.distanceTo(Eu);if(!(l<e.near||l>e.far))return{distance:l,point:Am.clone().applyMatrix4(t.matrixWorld),index:r,face:null,faceIndex:null,object:t}}const Cm=new F,Rm=new F;class VA extends HA{constructor(e,n){super(e,n),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const n=e.attributes.position,i=[];for(let r=0,s=n.count;r<s;r+=2)Cm.fromBufferAttribute(n,r),Rm.fromBufferAttribute(n,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+Cm.distanceTo(Rm);e.setAttribute("lineDistance",new vt(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ff extends Sn{constructor(e=1,n=1,i=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:n,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const f=[],d=[],h=[],p=[];let g=0;const x=[],m=i/2;let u=0;v(),o===!1&&(e>0&&_(!0),n>0&&_(!1)),this.setIndex(f),this.setAttribute("position",new vt(d,3)),this.setAttribute("normal",new vt(h,3)),this.setAttribute("uv",new vt(p,2));function v(){const M=new F,b=new F;let C=0;const A=(n-e)/i;for(let L=0;L<=s;L++){const T=[],S=L/s,U=S*(n-e)+e;for(let k=0;k<=r;k++){const D=k/r,V=D*l+a,z=Math.sin(V),O=Math.cos(V);b.x=U*z,b.y=-S*i+m,b.z=U*O,d.push(b.x,b.y,b.z),M.set(z,A,O).normalize(),h.push(M.x,M.y,M.z),p.push(D,1-S),T.push(g++)}x.push(T)}for(let L=0;L<r;L++)for(let T=0;T<s;T++){const S=x[T][L],U=x[T+1][L],k=x[T+1][L+1],D=x[T][L+1];f.push(S,U,D),f.push(U,k,D),C+=6}c.addGroup(u,C,0),u+=C}function _(M){const b=g,C=new ye,A=new F;let L=0;const T=M===!0?e:n,S=M===!0?1:-1;for(let k=1;k<=r;k++)d.push(0,m*S,0),h.push(0,S,0),p.push(.5,.5),g++;const U=g;for(let k=0;k<=r;k++){const V=k/r*l+a,z=Math.cos(V),O=Math.sin(V);A.x=T*O,A.y=m*S,A.z=T*z,d.push(A.x,A.y,A.z),h.push(0,S,0),C.x=z*.5+.5,C.y=O*.5*S+.5,p.push(C.x,C.y),g++}for(let k=0;k<r;k++){const D=b+k,V=U+k;M===!0?f.push(V,V+1,D):f.push(V+1,V,D),L+=3}c.addGroup(u,L,M===!0?1:2),u+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ff(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class mc extends Sn{constructor(e=1,n=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:n,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},n=Math.max(3,Math.floor(n)),i=Math.max(2,Math.floor(i));const l=Math.min(o+a,Math.PI);let c=0;const f=[],d=new F,h=new F,p=[],g=[],x=[],m=[];for(let u=0;u<=i;u++){const v=[],_=u/i;let M=0;u===0&&o===0?M=.5/n:u===i&&l===Math.PI&&(M=-.5/n);for(let b=0;b<=n;b++){const C=b/n;d.x=-e*Math.cos(r+C*s)*Math.sin(o+_*a),d.y=e*Math.cos(o+_*a),d.z=e*Math.sin(r+C*s)*Math.sin(o+_*a),g.push(d.x,d.y,d.z),h.copy(d).normalize(),x.push(h.x,h.y,h.z),m.push(C+M,1-_),v.push(c++)}f.push(v)}for(let u=0;u<i;u++)for(let v=0;v<n;v++){const _=f[u][v+1],M=f[u][v],b=f[u+1][v],C=f[u+1][v+1];(u!==0||o>0)&&p.push(_,M,C),(u!==i-1||l<Math.PI)&&p.push(M,b,C)}this.setIndex(p),this.setAttribute("position",new vt(g,3)),this.setAttribute("normal",new vt(x,3)),this.setAttribute("uv",new vt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new mc(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Of extends Sn{constructor(e=1,n=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:n,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);const o=[],a=[],l=[],c=[],f=new F,d=new F,h=new F;for(let p=0;p<=i;p++)for(let g=0;g<=r;g++){const x=g/r*s,m=p/i*Math.PI*2;d.x=(e+n*Math.cos(m))*Math.cos(x),d.y=(e+n*Math.cos(m))*Math.sin(x),d.z=n*Math.sin(m),a.push(d.x,d.y,d.z),f.x=e*Math.cos(x),f.y=e*Math.sin(x),h.subVectors(d,f).normalize(),l.push(h.x,h.y,h.z),c.push(g/r),c.push(p/i)}for(let p=1;p<=i;p++)for(let g=1;g<=r;g++){const x=(r+1)*p+g-1,m=(r+1)*(p-1)+g-1,u=(r+1)*(p-1)+g,v=(r+1)*p+g;o.push(x,m,v),o.push(m,u,v)}this.setIndex(o),this.setAttribute("position",new vt(a,3)),this.setAttribute("normal",new vt(l,3)),this.setAttribute("uv",new vt(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Of(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class GA extends Zt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class zn extends Ys{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ge(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ge(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=kv,this.normalScale=new ye(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new si,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class r_ extends At{constructor(e,n=1){super(),this.isLight=!0,this.type="Light",this.color=new Ge(e),this.intensity=n}dispose(){}copy(e,n){return super.copy(e,n),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const n=super.toJSON(e);return n.object.color=this.color.getHex(),n.object.intensity=this.intensity,this.groundColor!==void 0&&(n.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(n.object.distance=this.distance),this.angle!==void 0&&(n.object.angle=this.angle),this.decay!==void 0&&(n.object.decay=this.decay),this.penumbra!==void 0&&(n.object.penumbra=this.penumbra),this.shadow!==void 0&&(n.object.shadow=this.shadow.toJSON()),n}}const Tu=new ot,bm=new F,Pm=new F;class jA{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ye(512,512),this.map=null,this.mapPass=null,this.matrix=new ot,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Df,this._frameExtents=new ye(1,1),this._viewportCount=1,this._viewports=[new It(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const n=this.camera,i=this.matrix;bm.setFromMatrixPosition(e.matrixWorld),n.position.copy(bm),Pm.setFromMatrixPosition(e.target.matrixWorld),n.lookAt(Pm),n.updateMatrixWorld(),Tu.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Tu),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Tu)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class WA extends jA{constructor(){super(new If(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class wu extends r_{constructor(e,n){super(e,n),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(At.DEFAULT_UP),this.updateMatrix(),this.target=new At,this.shadow=new WA}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class XA extends r_{constructor(e,n){super(e,n),this.isAmbientLight=!0,this.type="AmbientLight"}}class $A{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Lm(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const n=Lm();e=(n-this.oldTime)/1e3,this.oldTime=n,this.elapsedTime+=e}return e}}function Lm(){return(typeof performance>"u"?Date:performance).now()}const Nm=new ot;class s_{constructor(e,n,i=0,r=1/0){this.ray=new fc(e,n),this.near=i,this.far=r,this.camera=null,this.layers=new Nf,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,n){this.ray.set(e,n)}setFromCamera(e,n){n.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(n.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(n).sub(this.ray.origin).normalize(),this.camera=n):n.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(n.near+n.far)/(n.near-n.far)).unproject(n),this.ray.direction.set(0,0,-1).transformDirection(n.matrixWorld),this.camera=n):console.error("THREE.Raycaster: Unsupported camera type: "+n.type)}setFromXRController(e){return Nm.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Nm),this}intersectObject(e,n=!0,i=[]){return Pd(e,this,i,n),i.sort(Dm),i}intersectObjects(e,n=!0,i=[]){for(let r=0,s=e.length;r<s;r++)Pd(e[r],this,i,n);return i.sort(Dm),i}}function Dm(t,e){return t.distance-e.distance}function Pd(t,e,n,i){if(t.layers.test(e.layers)&&t.raycast(e,n),i===!0){const r=t.children;for(let s=0,o=r.length;s<o;s++)Pd(r[s],e,n,!0)}}class Wl{constructor(e=1,n=0,i=0){return this.radius=e,this.phi=n,this.theta=i,this}set(e,n,i){return this.radius=e,this.phi=n,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,n,i){return this.radius=Math.sqrt(e*e+n*n+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Xt(n/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class YA extends VA{constructor(e=10,n=10,i=4473924,r=8947848){i=new Ge(i),r=new Ge(r);const s=n/2,o=e/n,a=e/2,l=[],c=[];for(let h=0,p=0,g=-a;h<=n;h++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const x=h===s?i:r;x.toArray(c,p),p+=3,x.toArray(c,p),p+=3,x.toArray(c,p),p+=3,x.toArray(c,p),p+=3}const f=new Sn;f.setAttribute("position",new vt(l,3)),f.setAttribute("color",new vt(c,3));const d=new i_({vertexColors:!0,toneMapped:!1});super(f,d),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Rf}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Rf);const Im={type:"change"},Au={type:"start"},Um={type:"end"},Ka=new fc,Fm=new Bi,qA=Math.cos(70*Bv.DEG2RAD);class KA extends kr{constructor(e,n){super(),this.object=e,this.domElement=n,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new F,this.cursor=new F,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Hr.ROTATE,MIDDLE:Hr.DOLLY,RIGHT:Hr.PAN},this.touches={ONE:Vr.ROTATE,TWO:Vr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return a.phi},this.getAzimuthalAngle=function(){return a.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(E){E.addEventListener("keydown",Le),this._domElementKeyEvents=E},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",Le),this._domElementKeyEvents=null},this.saveState=function(){i.target0.copy(i.target),i.position0.copy(i.object.position),i.zoom0=i.object.zoom},this.reset=function(){i.target.copy(i.target0),i.object.position.copy(i.position0),i.object.zoom=i.zoom0,i.object.updateProjectionMatrix(),i.dispatchEvent(Im),i.update(),s=r.NONE},this.update=function(){const E=new F,B=new nn().setFromUnitVectors(e.up,new F(0,1,0)),W=B.clone().invert(),te=new F,le=new nn,Fe=new F,We=2*Math.PI;return function(bt=null){const Ze=i.object.position;E.copy(Ze).sub(i.target),E.applyQuaternion(B),a.setFromVector3(E),i.autoRotate&&s===r.NONE&&k(S(bt)),i.enableDamping?(a.theta+=l.theta*i.dampingFactor,a.phi+=l.phi*i.dampingFactor):(a.theta+=l.theta,a.phi+=l.phi);let yt=i.minAzimuthAngle,at=i.maxAzimuthAngle;isFinite(yt)&&isFinite(at)&&(yt<-Math.PI?yt+=We:yt>Math.PI&&(yt-=We),at<-Math.PI?at+=We:at>Math.PI&&(at-=We),yt<=at?a.theta=Math.max(yt,Math.min(at,a.theta)):a.theta=a.theta>(yt+at)/2?Math.max(yt,a.theta):Math.min(at,a.theta)),a.phi=Math.max(i.minPolarAngle,Math.min(i.maxPolarAngle,a.phi)),a.makeSafe(),i.enableDamping===!0?i.target.addScaledVector(f,i.dampingFactor):i.target.add(f),i.target.sub(i.cursor),i.target.clampLength(i.minTargetRadius,i.maxTargetRadius),i.target.add(i.cursor);let Ri=!1;if(i.zoomToCursor&&C||i.object.isOrthographicCamera)a.radius=X(a.radius);else{const Mn=a.radius;a.radius=X(a.radius*c),Ri=Mn!=a.radius}if(E.setFromSpherical(a),E.applyQuaternion(W),Ze.copy(i.target).add(E),i.object.lookAt(i.target),i.enableDamping===!0?(l.theta*=1-i.dampingFactor,l.phi*=1-i.dampingFactor,f.multiplyScalar(1-i.dampingFactor)):(l.set(0,0,0),f.set(0,0,0)),i.zoomToCursor&&C){let Mn=null;if(i.object.isPerspectiveCamera){const bi=E.length();Mn=X(bi*c);const oi=bi-Mn;i.object.position.addScaledVector(M,oi),i.object.updateMatrixWorld(),Ri=!!oi}else if(i.object.isOrthographicCamera){const bi=new F(b.x,b.y,0);bi.unproject(i.object);const oi=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),i.object.updateProjectionMatrix(),Ri=oi!==i.object.zoom;const Qs=new F(b.x,b.y,0);Qs.unproject(i.object),i.object.position.sub(Qs).add(bi),i.object.updateMatrixWorld(),Mn=E.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),i.zoomToCursor=!1;Mn!==null&&(this.screenSpacePanning?i.target.set(0,0,-1).transformDirection(i.object.matrix).multiplyScalar(Mn).add(i.object.position):(Ka.origin.copy(i.object.position),Ka.direction.set(0,0,-1).transformDirection(i.object.matrix),Math.abs(i.object.up.dot(Ka.direction))<qA?e.lookAt(i.target):(Fm.setFromNormalAndCoplanarPoint(i.object.up,i.target),Ka.intersectPlane(Fm,i.target))))}else if(i.object.isOrthographicCamera){const Mn=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),Mn!==i.object.zoom&&(i.object.updateProjectionMatrix(),Ri=!0)}return c=1,C=!1,Ri||te.distanceToSquared(i.object.position)>o||8*(1-le.dot(i.object.quaternion))>o||Fe.distanceToSquared(i.target)>o?(i.dispatchEvent(Im),te.copy(i.object.position),le.copy(i.object.quaternion),Fe.copy(i.target),!0):!1}}(),this.dispose=function(){i.domElement.removeEventListener("contextmenu",Ye),i.domElement.removeEventListener("pointerdown",P),i.domElement.removeEventListener("pointercancel",j),i.domElement.removeEventListener("wheel",re),i.domElement.removeEventListener("pointermove",w),i.domElement.removeEventListener("pointerup",j),i.domElement.getRootNode().removeEventListener("keydown",pe,{capture:!0}),i._domElementKeyEvents!==null&&(i._domElementKeyEvents.removeEventListener("keydown",Le),i._domElementKeyEvents=null)};const i=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let s=r.NONE;const o=1e-6,a=new Wl,l=new Wl;let c=1;const f=new F,d=new ye,h=new ye,p=new ye,g=new ye,x=new ye,m=new ye,u=new ye,v=new ye,_=new ye,M=new F,b=new ye;let C=!1;const A=[],L={};let T=!1;function S(E){return E!==null?2*Math.PI/60*i.autoRotateSpeed*E:2*Math.PI/60/60*i.autoRotateSpeed}function U(E){const B=Math.abs(E*.01);return Math.pow(.95,i.zoomSpeed*B)}function k(E){l.theta-=E}function D(E){l.phi-=E}const V=function(){const E=new F;return function(W,te){E.setFromMatrixColumn(te,0),E.multiplyScalar(-W),f.add(E)}}(),z=function(){const E=new F;return function(W,te){i.screenSpacePanning===!0?E.setFromMatrixColumn(te,1):(E.setFromMatrixColumn(te,0),E.crossVectors(i.object.up,E)),E.multiplyScalar(W),f.add(E)}}(),O=function(){const E=new F;return function(W,te){const le=i.domElement;if(i.object.isPerspectiveCamera){const Fe=i.object.position;E.copy(Fe).sub(i.target);let We=E.length();We*=Math.tan(i.object.fov/2*Math.PI/180),V(2*W*We/le.clientHeight,i.object.matrix),z(2*te*We/le.clientHeight,i.object.matrix)}else i.object.isOrthographicCamera?(V(W*(i.object.right-i.object.left)/i.object.zoom/le.clientWidth,i.object.matrix),z(te*(i.object.top-i.object.bottom)/i.object.zoom/le.clientHeight,i.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),i.enablePan=!1)}}();function Z(E){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c/=E:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function I(E){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c*=E:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function G(E,B){if(!i.zoomToCursor)return;C=!0;const W=i.domElement.getBoundingClientRect(),te=E-W.left,le=B-W.top,Fe=W.width,We=W.height;b.x=te/Fe*2-1,b.y=-(le/We)*2+1,M.set(b.x,b.y,1).unproject(i.object).sub(i.object.position).normalize()}function X(E){return Math.max(i.minDistance,Math.min(i.maxDistance,E))}function ee(E){d.set(E.clientX,E.clientY)}function ue(E){G(E.clientX,E.clientX),u.set(E.clientX,E.clientY)}function be(E){g.set(E.clientX,E.clientY)}function K(E){h.set(E.clientX,E.clientY),p.subVectors(h,d).multiplyScalar(i.rotateSpeed);const B=i.domElement;k(2*Math.PI*p.x/B.clientHeight),D(2*Math.PI*p.y/B.clientHeight),d.copy(h),i.update()}function ne(E){v.set(E.clientX,E.clientY),_.subVectors(v,u),_.y>0?Z(U(_.y)):_.y<0&&I(U(_.y)),u.copy(v),i.update()}function he(E){x.set(E.clientX,E.clientY),m.subVectors(x,g).multiplyScalar(i.panSpeed),O(m.x,m.y),g.copy(x),i.update()}function ae(E){G(E.clientX,E.clientY),E.deltaY<0?I(U(E.deltaY)):E.deltaY>0&&Z(U(E.deltaY)),i.update()}function He(E){let B=!1;switch(E.code){case i.keys.UP:E.ctrlKey||E.metaKey||E.shiftKey?D(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):O(0,i.keyPanSpeed),B=!0;break;case i.keys.BOTTOM:E.ctrlKey||E.metaKey||E.shiftKey?D(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):O(0,-i.keyPanSpeed),B=!0;break;case i.keys.LEFT:E.ctrlKey||E.metaKey||E.shiftKey?k(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):O(i.keyPanSpeed,0),B=!0;break;case i.keys.RIGHT:E.ctrlKey||E.metaKey||E.shiftKey?k(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):O(-i.keyPanSpeed,0),B=!0;break}B&&(E.preventDefault(),i.update())}function Ne(E){if(A.length===1)d.set(E.pageX,E.pageY);else{const B=it(E),W=.5*(E.pageX+B.x),te=.5*(E.pageY+B.y);d.set(W,te)}}function N(E){if(A.length===1)g.set(E.pageX,E.pageY);else{const B=it(E),W=.5*(E.pageX+B.x),te=.5*(E.pageY+B.y);g.set(W,te)}}function xe(E){const B=it(E),W=E.pageX-B.x,te=E.pageY-B.y,le=Math.sqrt(W*W+te*te);u.set(0,le)}function oe(E){i.enableZoom&&xe(E),i.enablePan&&N(E)}function Ve(E){i.enableZoom&&xe(E),i.enableRotate&&Ne(E)}function ge(E){if(A.length==1)h.set(E.pageX,E.pageY);else{const W=it(E),te=.5*(E.pageX+W.x),le=.5*(E.pageY+W.y);h.set(te,le)}p.subVectors(h,d).multiplyScalar(i.rotateSpeed);const B=i.domElement;k(2*Math.PI*p.x/B.clientHeight),D(2*Math.PI*p.y/B.clientHeight),d.copy(h)}function we(E){if(A.length===1)x.set(E.pageX,E.pageY);else{const B=it(E),W=.5*(E.pageX+B.x),te=.5*(E.pageY+B.y);x.set(W,te)}m.subVectors(x,g).multiplyScalar(i.panSpeed),O(m.x,m.y),g.copy(x)}function Ce(E){const B=it(E),W=E.pageX-B.x,te=E.pageY-B.y,le=Math.sqrt(W*W+te*te);v.set(0,le),_.set(0,Math.pow(v.y/u.y,i.zoomSpeed)),Z(_.y),u.copy(v);const Fe=(E.pageX+B.x)*.5,We=(E.pageY+B.y)*.5;G(Fe,We)}function Pe(E){i.enableZoom&&Ce(E),i.enablePan&&we(E)}function et(E){i.enableZoom&&Ce(E),i.enableRotate&&ge(E)}function P(E){i.enabled!==!1&&(A.length===0&&(i.domElement.setPointerCapture(E.pointerId),i.domElement.addEventListener("pointermove",w),i.domElement.addEventListener("pointerup",j)),!Ue(E)&&(Ae(E),E.pointerType==="touch"?ce(E):Q(E)))}function w(E){i.enabled!==!1&&(E.pointerType==="touch"?Ee(E):ie(E))}function j(E){switch(_e(E),A.length){case 0:i.domElement.releasePointerCapture(E.pointerId),i.domElement.removeEventListener("pointermove",w),i.domElement.removeEventListener("pointerup",j),i.dispatchEvent(Um),s=r.NONE;break;case 1:const B=A[0],W=L[B];ce({pointerId:B,pageX:W.x,pageY:W.y});break}}function Q(E){let B;switch(E.button){case 0:B=i.mouseButtons.LEFT;break;case 1:B=i.mouseButtons.MIDDLE;break;case 2:B=i.mouseButtons.RIGHT;break;default:B=-1}switch(B){case Hr.DOLLY:if(i.enableZoom===!1)return;ue(E),s=r.DOLLY;break;case Hr.ROTATE:if(E.ctrlKey||E.metaKey||E.shiftKey){if(i.enablePan===!1)return;be(E),s=r.PAN}else{if(i.enableRotate===!1)return;ee(E),s=r.ROTATE}break;case Hr.PAN:if(E.ctrlKey||E.metaKey||E.shiftKey){if(i.enableRotate===!1)return;ee(E),s=r.ROTATE}else{if(i.enablePan===!1)return;be(E),s=r.PAN}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Au)}function ie(E){switch(s){case r.ROTATE:if(i.enableRotate===!1)return;K(E);break;case r.DOLLY:if(i.enableZoom===!1)return;ne(E);break;case r.PAN:if(i.enablePan===!1)return;he(E);break}}function re(E){i.enabled===!1||i.enableZoom===!1||s!==r.NONE||(E.preventDefault(),i.dispatchEvent(Au),ae(Te(E)),i.dispatchEvent(Um))}function Te(E){const B=E.deltaMode,W={clientX:E.clientX,clientY:E.clientY,deltaY:E.deltaY};switch(B){case 1:W.deltaY*=16;break;case 2:W.deltaY*=100;break}return E.ctrlKey&&!T&&(W.deltaY*=10),W}function pe(E){E.key==="Control"&&(T=!0,i.domElement.getRootNode().addEventListener("keyup",fe,{passive:!0,capture:!0}))}function fe(E){E.key==="Control"&&(T=!1,i.domElement.getRootNode().removeEventListener("keyup",fe,{passive:!0,capture:!0}))}function Le(E){i.enabled===!1||i.enablePan===!1||He(E)}function ce(E){switch(je(E),A.length){case 1:switch(i.touches.ONE){case Vr.ROTATE:if(i.enableRotate===!1)return;Ne(E),s=r.TOUCH_ROTATE;break;case Vr.PAN:if(i.enablePan===!1)return;N(E),s=r.TOUCH_PAN;break;default:s=r.NONE}break;case 2:switch(i.touches.TWO){case Vr.DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;oe(E),s=r.TOUCH_DOLLY_PAN;break;case Vr.DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;Ve(E),s=r.TOUCH_DOLLY_ROTATE;break;default:s=r.NONE}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Au)}function Ee(E){switch(je(E),s){case r.TOUCH_ROTATE:if(i.enableRotate===!1)return;ge(E),i.update();break;case r.TOUCH_PAN:if(i.enablePan===!1)return;we(E),i.update();break;case r.TOUCH_DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;Pe(E),i.update();break;case r.TOUCH_DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;et(E),i.update();break;default:s=r.NONE}}function Ye(E){i.enabled!==!1&&E.preventDefault()}function Ae(E){A.push(E.pointerId)}function _e(E){delete L[E.pointerId];for(let B=0;B<A.length;B++)if(A[B]==E.pointerId){A.splice(B,1);return}}function Ue(E){for(let B=0;B<A.length;B++)if(A[B]==E.pointerId)return!0;return!1}function je(E){let B=L[E.pointerId];B===void 0&&(B=new ye,L[E.pointerId]=B),B.set(E.pageX,E.pageY)}function it(E){const B=E.pointerId===A[0]?A[1]:A[0];return L[B]}i.domElement.addEventListener("contextmenu",Ye),i.domElement.addEventListener("pointerdown",P),i.domElement.addEventListener("pointercancel",j),i.domElement.addEventListener("wheel",re,{passive:!1}),i.domElement.getRootNode().addEventListener("keydown",pe,{passive:!0,capture:!0}),this.update()}}const o_={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class Zs{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const ZA=new If(-1,1,1,-1,0,1);class QA extends Sn{constructor(){super(),this.setAttribute("position",new vt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new vt([0,2,0,0,2,0],2))}}const JA=new QA;class kf{constructor(e){this._mesh=new Dt(JA,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ZA)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class eC extends Zs{constructor(e,n){super(),this.textureID=n!==void 0?n:"tDiffuse",e instanceof Zt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ta.clone(e.uniforms),this.material=new Zt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new kf(this.material)}render(e,n,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class Om extends Zs{constructor(e,n){super(),this.scene=e,this.camera=n,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,n,i){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class tC extends Zs{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class nC{constructor(e,n){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),n===void 0){const i=e.getSize(new ye);this._width=i.width,this._height=i.height,n=new $n(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ir}),n.texture.name="EffectComposer.rt1"}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new eC(o_),this.copyPass.material.blending=Si,this.clock=new $A}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,n){this.passes.splice(n,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const n=this.passes.indexOf(e);n!==-1&&this.passes.splice(n,1)}isLastEnabledPass(e){for(let n=e+1;n<this.passes.length;n++)if(this.passes[n].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const n=this.renderer.getRenderTarget();let i=!1;for(let r=0,s=this.passes.length;r<s;r++){const o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Om!==void 0&&(o instanceof Om?i=!0:o instanceof tC&&(i=!1))}}this.renderer.setRenderTarget(n)}reset(e){if(e===void 0){const n=this.renderer.getSize(new ye);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,n){this._width=e,this._height=n;const i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class iC extends Zs{constructor(e,n,i=null,r=null,s=null){super(),this.scene=e,this.camera=n,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ge}render(e,n,i){const r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}}const rC={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ge(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class Gs extends Zs{constructor(e,n,i,r){super(),this.strength=n!==void 0?n:1,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new ye(e.x,e.y):new ye(256,256),this.clearColor=new Ge(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new $n(s,o,{type:ir}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let d=0;d<this.nMips;d++){const h=new $n(s,o,{type:ir});h.texture.name="UnrealBloomPass.h"+d,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);const p=new $n(s,o,{type:ir});p.texture.name="UnrealBloomPass.v"+d,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),s=Math.round(s/2),o=Math.round(o/2)}const a=rC;this.highPassUniforms=ta.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Zt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let d=0;d<this.nMips;d++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[d])),this.separableBlurMaterials[d].uniforms.invSize.value=new ye(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=n,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new F(1,1,1),new F(1,1,1),new F(1,1,1),new F(1,1,1),new F(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const f=o_;this.copyUniforms=ta.clone(f.uniforms),this.blendMaterial=new Zt({uniforms:this.copyUniforms,vertexShader:f.vertexShader,fragmentShader:f.fragmentShader,blending:Md,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ge,this.oldClearAlpha=1,this.basic=new hc,this.fsQuad=new kf(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,n){let i=Math.round(e/2),r=Math.round(n/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new ye(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,n,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=Gs.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Gs.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),a=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const n=[];for(let i=0;i<e;i++)n.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Zt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new ye(.5,.5)},direction:{value:new ye(.5,.5)},gaussianCoefficients:{value:n}},vertexShader:`varying vec2 vUv;
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
				}`})}getCompositeMaterial(e){return new Zt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}Gs.BlurDirectionX=new ye(1,0);Gs.BlurDirectionY=new ye(0,1);const sC={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class oC extends Zs{constructor(){super();const e=sC;this.uniforms=ta.clone(e.uniforms),this.material=new GA({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new kf(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,n,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},tt.getTransfer(this._outputColorSpace)===rt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===wv?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Av?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Cv?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===bf?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Rv?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===bv&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(n),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const _t={camera:null,animateTo:null,fitCamera:null,orbitDelta:null,getArmNodes:null};class aC{constructor(e){this.canvas=e,this._init()}_init(){const e=this.canvas,n=e.clientWidth,i=e.clientHeight;this.renderer=new zA({canvas:e,antialias:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.setSize(n,i,!1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ev,this.renderer.toneMapping=bf,this.renderer.toneMappingExposure=.95,this.renderer.outputColorSpace=Vn,this.scene=new BA,this.scene.background=new Ge(16052974),this.scene.fog=null,this.camera=new Rn(52,n/i,.1,100),this.camera.position.set(3,4,10),this.camera.lookAt(3,0,0);const r=new XA(13162736,1.5);this.scene.add(r);const s=new wu(16777215,2.8);s.position.set(5,12,7),s.castShadow=!0,s.shadow.mapSize.width=2048,s.shadow.mapSize.height=2048,s.shadow.camera.near=.5,s.shadow.camera.far=50,s.shadow.camera.left=-10,s.shadow.camera.right=10,s.shadow.camera.top=10,s.shadow.camera.bottom=-10,s.shadow.bias=-4e-4,this.scene.add(s);const o=new wu(11585776,.8);o.position.set(-5,4,-3),this.scene.add(o);const a=new wu(15266047,.5);a.position.set(0,-3,-8),this.scene.add(a),this._buildGround(),this.controls=new KA(this.camera,e),this.controls.enableDamping=!0,this.controls.dampingFactor=.07,this.controls.minDistance=3,this.controls.maxDistance=25,this.controls.maxPolarAngle=Math.PI*.48,this.controls.enablePan=!1,this.controls.target.set(3,0,0),this._buildPostProcessing(n,i),this._resizeObserver=new ResizeObserver(()=>this._onResize()),this._resizeObserver.observe(e.parentElement),_t.camera=this.camera,_t.animateTo=(l,c,f)=>this.animateCameraTo(l,c,f),_t.fitCamera=()=>this.fitCamera(),_t.orbitDelta=(l,c)=>{const f=this.controls.target.clone(),d=this.camera.position.clone().sub(f),h=new Wl().setFromVector3(d);h.theta-=l*.008,h.phi=Math.max(.05,Math.min(Math.PI*.47,h.phi-c*.006)),d.setFromSpherical(h),this.camera.position.copy(f).add(d),this.controls.target.copy(f),this.controls.update()},requestAnimationFrame(()=>this._onResize())}_buildGround(){const e=new qs(30,30),n=new zn({color:14736340,roughness:.95,metalness:0}),i=new Dt(e,n);i.rotation.x=-Math.PI/2,i.position.y=-3.2,i.receiveShadow=!0,this.scene.add(i);const r=new YA(28,28,10137548,12373216);r.position.y=-3.19,r.material.opacity=.55,r.material.transparent=!0,this.scene.add(r),this.ground=i}_buildPostProcessing(e,n){this.composer=new nC(this.renderer);const i=new iC(this.scene,this.camera);this.composer.addPass(i),this.bloomPass=new Gs(new ye(e,n),.18,.25,.95),this.composer.addPass(this.bloomPass);const r=new oC;this.composer.addPass(r)}_onResize(){const e=this.canvas,n=e.clientWidth,i=e.clientHeight;n===0||i===0||(this.camera.aspect=n/i,this.camera.updateProjectionMatrix(),this.renderer.setSize(n,i,!1),this.composer.setSize(n,i))}setOrbitEnabled(e){this.controls.enabled=e}animateCameraTo(e,n,i=700){const r=this.camera.position.clone(),s=this.controls.target.clone(),o=new F(...Object.values(e)),a=new F(...Object.values(n)),l=performance.now(),c=()=>{const f=Math.min((performance.now()-l)/i,1),d=lC(f);this.camera.position.lerpVectors(r,o,d),this.controls.target.lerpVectors(s,a,d),this.controls.update(),f<1&&requestAnimationFrame(c)};requestAnimationFrame(c)}fitCamera(){const e=_t.getArmNodes?_t.getArmNodes():null;if(!e||e.length===0)return;const n=e.map(f=>new F(f.x,f.y,f.z)),i=new F;n.forEach(f=>i.add(f)),i.divideScalar(n.length);let r=0;n.forEach(f=>{r=Math.max(r,f.distanceTo(i))}),r=Math.max(r,.5);const s=Bv.degToRad(this.camera.fov/2),o=Math.max(r*1.45/Math.tan(s),4),a=this.camera.position.clone().sub(this.controls.target),l=new Wl().setFromVector3(a);l.radius=o,l.phi=Math.max(.35,Math.min(Math.PI*.44,l.phi)),a.setFromSpherical(l);const c=i.clone().add(a);this.animateCameraTo({x:c.x,y:c.y,z:c.z},{x:i.x,y:i.y,z:i.z})}render(){this.controls.update(),this.composer.render()}dispose(){this._resizeObserver.disconnect(),this.renderer.dispose(),this.composer.dispose()}}function lC(t){return t<.5?2*t*t:-1+(4-2*t)*t}function cC(t){const e=new Ff(tp,tp,t,6,1,!1,Math.PI/6);return e.applyMatrix4(new ot().makeRotationZ(Math.PI/2)),e.applyMatrix4(new ot().makeTranslation(t/2,0,0)),e}function uC(){return new zr(mn,mn,mn*2)}const dC=(()=>{const t=new zr(mn,mn,mn);return t.applyMatrix4(new ot().makeTranslation(mn/2,0,0)),t})(),fC=new mc(Fl,20,20),km=new Of(Fl*1.55,Fl*.22,10,28),hC=new mc(Fl*1.3,20,20),wn={rod:()=>new zn({color:8032170,roughness:.38,metalness:.55,flatShading:!0}),rodRoot:()=>new zn({color:16755234,roughness:.18,metalness:.75,emissive:16746496,emissiveIntensity:.4,flatShading:!0}),rodHover:()=>new zn({color:10402e3,roughness:.2,metalness:.88,emissive:1721480,emissiveIntensity:.22,flatShading:!0}),endRod:()=>new zn({color:13213728,roughness:.22,metalness:.78,emissive:9067008,emissiveIntensity:.08}),endRodRoot:()=>new zn({color:16763972,roughness:.14,metalness:.82,emissive:16750848,emissiveIntensity:.55}),twistJoint:()=>new zn({color:14509568,roughness:.25,metalness:.7,emissive:13386752,emissiveIntensity:.3}),twistJointLimit:()=>new zn({color:16720384,roughness:.25,metalness:.6,emissive:16720384,emissiveIntensity:.9}),bendJoint:()=>new zn({color:2767442,roughness:.32,metalness:.78,emissive:21964,emissiveIntensity:.18}),bendJointLimit:()=>new zn({color:16720384,roughness:.2,metalness:.6,emissive:16720384,emissiveIntensity:.9}),jointRing:()=>new zn({color:4478310,roughness:.3,metalness:.85})};class zm{constructor(e){this.scene=e,this.robotGroup=new Eo,e.add(this.robotGroup),this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._facesVisible=!1,this._activeRootId="R1",this._build("R1",[0,0,0,0,0,0]),this._addFacePlanes()}computeAnglesForRoot(e,n="horizontal"){const i={};for(const f of Xi){const d=this._rodMeshes[f];i[f]=d?d.getWorldQuaternion(new nn):new nn}const r=this._rodMeshes[e],s=r?r.getWorldPosition(new F):new F,o=i[e].clone(),a=[0,0,0,0,0,0],l=new Set,c=(f,d)=>{l.add(f);for(let h=0;h<Nt.length;h++){const p=Nt[h],g=p.bodyA===f,x=p.bodyB===f;if(!g&&!x)continue;const m=g?p.bodyB:p.bodyA;if(l.has(m))continue;const u=i[m],v=d.clone().invert().multiply(u);let _;if(p.type==="bend"){const A=new F(1,0,0).applyQuaternion(v);n==="vertical"?_=Math.atan2(A.y,A.x):_=Math.atan2(-A.z,A.x)}else{const A=new F(0,1,0).applyQuaternion(v);_=Math.atan2(A.z,A.y)}_=Math.max(-p.limit,Math.min(p.limit,_)),a[h]=_;const M=p.type==="bend"?new F(0,1,0):new F(1,0,0),b=new nn().setFromAxisAngle(M,_),C=d.clone().multiply(b);c(m,C)}};return c(e,o),{newAngles:a,rootPos:s,rootQuat:o}}rebuild(e,n,i=null,r=null){for(this._activeRootId=e;this.robotGroup.children.length>0;)this.robotGroup.remove(this.robotGroup.children[0]);this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._build(e,n),this._addFacePlanes(),this._facesVisible&&this.showFaceIndicators(!0),this.robotGroup.position.copy(i??new F),this.robotGroup.quaternion.copy(r??new nn)}updateAngles(e,n="horizontal"){for(let i=0;i<Nt.length;i++){const r=Nt[i],s=this._jointNodes[r.id];s&&(r.type==="twist"?s.rotation.x=e[i]:n==="vertical"?(s.rotation.z=e[i],s.rotation.y=0):(s.rotation.y=e[i],s.rotation.z=0))}}setHoverHighlight(e,n){const i=this._rodMats[e];if(!i||e===this._activeRootId)return;const r=this._rodMeshes[e];r&&(r.material=n?i.hover:i.normal,e==="R3"&&this._r3CuboidMesh&&(this._r3CuboidMesh.material=n?i.hover:i.normal))}setLimitHighlight(e,n){const i=this._jointSphereMeshes[e];i&&(i.mesh.material=n?i.limitMat:i.normalMat)}get interactables(){const e=Object.values(this._rodMeshes);return this._r3CuboidMesh&&e.push(this._r3CuboidMesh),e}getEndEffectorWorld(){const i=Xi.indexOf(this._activeRootId)<=3?this._tipR7:this._tipR1;if(!i)return{x:0,y:0,z:0};const r=new F;return i.getWorldPosition(r),{x:r.x,y:r.y,z:r.z}}getNodePositions(){this.robotGroup.updateMatrixWorld(!0);const e=new F;return["J1","J2","J3","J4","J5","J6"].map(n=>{const i=this._jointNodes[n];return i?i.getWorldPosition(e.clone()):new F})}_build(e,n){const i=this._makeRodMesh(e,!0);i.position.set(0,0,0),this.robotGroup.add(i),e==="R1"?(this._tipR1=this._makeTip(),this._tipR1.position.set(this._rodLen("R1"),0,0),i.add(this._tipR1)):e==="R7"&&(this._tipR7=this._makeTip(),this._tipR7.position.set(0,0,0),i.add(this._tipR7)),this._traverseFrom(e,i,n,new Set([e]))}_traverseFrom(e,n,i,r){for(let s=0;s<Nt.length;s++){const o=Nt[s],a=o.bodyA===e,l=o.bodyB===e;if(!a&&!l)continue;const c=a?o.bodyB:o.bodyA;if(r.has(c))continue;r.add(c);const f=new At;f.name=o.id+"_pivot",this._addJointVisual(f,o),a?f.position.set(this._rodLen(e),0,0):f.position.set(0,0,0);const d=i[s]??0;o.type==="twist"?f.rotation.x=d:f.rotation.y=d,this._jointNodes[o.id]=f,n.add(f);const h=this._makeRodMesh(c,!1);if(a?h.position.set(0,0,0):h.position.set(-this._rodLen(c),0,0),f.add(h),c==="R1"){const p=this._makeTip();p.position.set(0,0,0),h.add(p),this._tipR1=p}else if(c==="R7"){const p=this._makeTip();a?p.position.set(this._rodLen("R7"),0,0):p.position.set(0,0,0),h.add(p),this._tipR7=p}this._traverseFrom(c,h,i,r)}}_rodLen(e){return e==="R1"||e==="R7"?mn:as[e]??dS}_makeRodMesh(e,n){const i=e==="R1"||e==="R7",r=i?dC:cC(this._rodLen(e));let s,o,a;i?(s=wn.endRod(),o=wn.endRodRoot(),a=wn.rodHover()):(s=wn.rod(),o=wn.rodRoot(),a=wn.rodHover());const l=new Dt(r,n?o:s);if(l.castShadow=!0,l.receiveShadow=!0,l.userData={type:"rod",id:e},l.name=e,this._rodMeshes[e]=l,this._rodMats[e]={normal:s,root:o,hover:a},e==="R3"){const c=n?o.clone():s.clone(),f=new Dt(uC(),c);f.castShadow=!0,f.receiveShadow=!0,f.userData={type:"rod",id:"R3"},f.name="R3_cuboid",f.position.set(this._rodLen("R3")/2,0,0),l.add(f),this._r3CuboidMesh=f}return l}_addJointVisual(e,n){if(n.type==="twist"){const i=wn.twistJoint(),r=wn.twistJointLimit(),s=new Dt(hC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[n.id]={mesh:s,normalMat:i,limitMat:r}}else{const i=wn.bendJoint(),r=wn.bendJointLimit(),s=new Dt(fC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[n.id]={mesh:s,normalMat:i,limitMat:r};const o=new Dt(km,wn.jointRing());o.castShadow=!0,e.add(o);const a=new Dt(km,wn.jointRing());a.rotation.x=Math.PI/2,a.castShadow=!0,e.add(a)}}getJointWorldData(e="horizontal"){this.robotGroup.updateMatrixWorld(!0);const n=new nn;return Nt.map(i=>{const r=this._jointNodes[i.id];if(!r)return{pos:new F,axis:new F(0,1,0)};const s=r.getWorldPosition(new F),o=i.type==="twist"?new F(1,0,0):e==="vertical"?new F(0,0,1):new F(0,1,0),a=r.parent?r.parent.getWorldQuaternion(n):n.identity();return{pos:s,axis:o.applyQuaternion(a).normalize()}})}_addFacePlanes(){const e=mn*.88,n=new qs(e,e),i=(r,s,o,a,l,c)=>{if(!r)return;const f=new hc({color:43775,transparent:!0,opacity:0,side:Jn,depthTest:!1}),d=new Dt(n,f);d.rotation.y=c,d.position.set(o,a,l),d.userData={type:"face",faceKey:s},d.renderOrder=999,d.visible=!1,r.add(d),this._facePlaneMeshes.push(d)};i(this._rodMeshes.R1,"R1_outer",0,0,0,-Math.PI/2),i(this._rodMeshes.R7,"R7_outer",mn,0,0,+Math.PI/2),i(this._r3CuboidMesh,"R3_cuboid_plusZ",0,0,mn,0),i(this._r3CuboidMesh,"R3_cuboid_minusZ",0,0,-mn,Math.PI)}showFaceIndicators(e){this._facesVisible=e;for(const n of this._facePlaneMeshes)n.visible=e,n.material.opacity=e?.35:0,n.material.needsUpdate=!0}resetFaceHighlights(){for(const e of this._facePlaneMeshes)e.material.color.setHex(43775),e.material.opacity=this._facesVisible?.35:0,e.material.needsUpdate=!0}setFaceHighlight(e,n){const i={normal:{hex:43775,op:.35},selected1:{hex:65416,op:.75},selected2:{hex:16755200,op:.75},error:{hex:16720384,op:.8}}[n]??{hex:43775,op:.35};for(const r of this._facePlaneMeshes)r.userData.faceKey===e&&(r.material.color.setHex(i.hex),r.material.opacity=i.op,r.material.needsUpdate=!0)}getFaceIndicatorMeshes(){return this._facePlaneMeshes}getLinkBounds(){this.robotGroup.updateMatrixWorld(!0);const e={};for(const[n,i]of Object.entries(this._rodMeshes)){i.geometry.boundingBox||i.geometry.computeBoundingBox();const r=i.geometry.boundingBox.clone();if(r.applyMatrix4(i.matrixWorld),n==="R3"&&this._r3CuboidMesh){this._r3CuboidMesh.geometry.boundingBox||this._r3CuboidMesh.geometry.computeBoundingBox();const s=this._r3CuboidMesh.geometry.boundingBox.clone();s.applyMatrix4(this._r3CuboidMesh.matrixWorld),r.union(s)}e[n]=r}return e}_makeTip(){const e=new At;return e.name="tip_marker",e}}const Bm=new s_;class pC{constructor(e,n,i,r){this.canvas=e,this.camera=n,this.getInteractables=i,this.callbacks=r,this._mouseDownPos=new ye,this._dragLastNDC=new ye,this._hitId=null,this._hoveredId=null,this._dragging=!1,this.paused=!1,this._onMouseDown=this._onMouseDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this._onMouseUp=this._onMouseUp.bind(this),this._onTouchStart=this._onTouchStart.bind(this),this._onTouchMove=this._onTouchMove.bind(this),this._onTouchEnd=this._onTouchEnd.bind(this),e.addEventListener("mousedown",this._onMouseDown),e.addEventListener("mousemove",this._onMouseMove),e.addEventListener("mouseup",this._onMouseUp),e.addEventListener("touchstart",this._onTouchStart,{passive:!1}),e.addEventListener("touchmove",this._onTouchMove,{passive:!1}),e.addEventListener("touchend",this._onTouchEnd)}_getNDC(e,n){const i=this.canvas.getBoundingClientRect();return new ye((e-i.left)/i.width*2-1,-((n-i.top)/i.height)*2+1)}_raycastId(e){var r;Bm.setFromCamera(e,this.camera);const n=Bm.intersectObjects(this.getInteractables(),!1);if(!n.length)return null;let i=n[0].object;for(;i;){if((r=i.userData)!=null&&r.id)return i.userData.id;i=i.parent}return null}_onMouseDown(e){if(e.button!==0||this.paused)return;const n=this._getNDC(e.clientX,e.clientY);this._mouseDownPos.copy(n),this._dragLastNDC.copy(n),this._hitId=this._raycastId(n),this._dragging=!1}_onMouseMove(e){var i,r,s,o,a,l,c,f;if(this.paused)return;const n=this._getNDC(e.clientX,e.clientY);if(this._hitId&&(!this._dragging&&n.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(r=(i=this.callbacks).onDragStart)==null||r.call(i,this._hitId,n),this.canvas.style.cursor="grabbing"),this._dragging)){const d=n.x-this._dragLastNDC.x,h=n.y-this._dragLastNDC.y;(o=(s=this.callbacks).onDrag)==null||o.call(s,this._hitId,d,h,n),this._dragLastNDC.copy(n);return}if(!this._dragging){const d=this._raycastId(n);d!==this._hoveredId&&(this._hoveredId&&((l=(a=this.callbacks).onHoverChange)==null||l.call(a,this._hoveredId,!1)),this._hoveredId=d,d?((f=(c=this.callbacks).onHoverChange)==null||f.call(c,d,!0),this.canvas.style.cursor="grab"):this.canvas.style.cursor="default")}}_onMouseUp(e){var n,i,r,s;e.button!==0||this.paused||(this._dragging?(this._dragging=!1,(i=(n=this.callbacks).onDragEnd)==null||i.call(n),this.canvas.style.cursor=this._hoveredId?"grab":"default"):this._getNDC(e.clientX,e.clientY).distanceTo(this._mouseDownPos)<.015&&this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitId)),this._hitId=null)}_onTouchStart(e){if(e.preventDefault(),e.touches.length!==1)return;const n=e.touches[0],i=this._getNDC(n.clientX,n.clientY);this._mouseDownPos.copy(i),this._dragLastNDC.copy(i),this._hitId=this._raycastId(i),this._dragging=!1}_onTouchMove(e){var r,s,o,a;if(!this._hitId||e.touches.length!==1)return;e.preventDefault();const n=e.touches[0],i=this._getNDC(n.clientX,n.clientY);if(!this._dragging&&i.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(s=(r=this.callbacks).onDragStart)==null||s.call(r,this._hitId,i)),this._dragging){const l=i.x-this._dragLastNDC.x,c=i.y-this._dragLastNDC.y;(a=(o=this.callbacks).onDrag)==null||a.call(o,this._hitId,l,c,i),this._dragLastNDC.copy(i)}}_onTouchEnd(e){var n,i,r,s;this._dragging?(this._dragging=!1,(i=(n=this.callbacks).onDragEnd)==null||i.call(n)):this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitId)),this._hitId=null}dispose(){this.canvas.removeEventListener("mousedown",this._onMouseDown),this.canvas.removeEventListener("mousemove",this._onMouseMove),this.canvas.removeEventListener("mouseup",this._onMouseUp),this.canvas.removeEventListener("touchstart",this._onTouchStart),this.canvas.removeEventListener("touchmove",this._onTouchMove),this.canvas.removeEventListener("touchend",this._onTouchEnd)}}const mC=10,gC=.06,vC=.04,_C=.25,Za=3,Hm=15;class xC{constructor(e){this.numJoints=e,this.history=Array.from({length:e},()=>[]),this.smoothed=Array.from({length:e},()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}))}update(e,n,i){for(let r=0;r<this.numJoints;r++){const s=this.history[r];s.push({angle:e[r],time:i}),s.length>mC&&s.shift();let o=0;if(s.length>=3){const c=s.length,f=(s[c-1].time-s[c-3].time)/1e3;f>.001&&(o=(s[c-1].angle-s[c-3].angle)/f)}else if(s.length>=2){const c=s.length,f=(s[c-1].time-s[c-2].time)/1e3;f>0&&(o=(s[c-1].angle-s[c-2].angle)/f)}o=Math.max(-Za,Math.min(Za,o));let a=0;if(s.length>=5){const c=s.length,f=(s[c-3].time-s[c-5].time)/1e3,d=(s[c-1].time-s[c-3].time)/1e3;if(f>.001&&d>.001){const h=(s[c-3].angle-s[c-5].angle)/f,p=Math.max(-Za,Math.min(Za,h));a=(o-p)/((f+d)*.5)}}a=Math.max(-Hm,Math.min(Hm,a));const l=this.smoothed[r];this.smoothed[r]={angle:Cu(e[r],l.angle,_C),velocity:Cu(o,l.velocity,gC),acceleration:Cu(a,l.acceleration,vC),limitHit:n[r]??!1}}return this.smoothed.map(r=>({...r}))}reset(){this.history.forEach(e=>e.splice(0)),this.smoothed.forEach(e=>{e.angle=0,e.velocity=0,e.acceleration=0})}seed(e){this.history.forEach(n=>n.splice(0));for(let n=0;n<this.numJoints;n++)this.smoothed[n]={angle:e[n]??0,velocity:0,acceleration:0,limitHit:!1}}}function Cu(t,e,n){return n*t+(1-n)*e}const Ru=new F;function Vm(t,e,n,i){return Ru.set(t,e,n).project(i),{x:Ru.x,y:Ru.y}}const Gm=.05,jm=.08;function yC(t,e,n,i,r,s,o,a,l,c=.008,f=.5){const d=n.length;if(d===0)return[...o];const h=Vm(t.x,t.y,t.z,i);let p=r.x-s.x-h.x,g=r.y-s.y-h.y;const x=Math.sqrt(p*p+g*g);if(x<5e-4)return[...o];if(x>jm){const U=jm/x;p*=U,g*=U}const m=.006,u=new Float64Array(d*2);for(let U=0;U<d;U++){const k=n[U],{pos:D,axis:V}=e[k],z=t.x-D.x,O=t.y-D.y,Z=t.z-D.z,I=V.y*Z-V.z*O,G=V.z*z-V.x*Z,X=V.x*O-V.y*z,ee=Vm(t.x+I*m,t.y+G*m,t.z+X*m,i);u[U*2]=(ee.x-h.x)/m,u[U*2+1]=(ee.y-h.y)/m}let v=c,_=0,M=c;for(let U=0;U<d;U++){const k=u[U*2],D=u[U*2+1];v+=k*k,_+=k*D,M+=D*D}const b=v*M-_*_;if(Math.abs(b)<1e-14)return[...o];const C=p*f,A=g*f,L=(M*C-_*A)/b,T=(-_*C+v*A)/b,S=[...o];for(let U=0;U<d;U++){const k=n[U],V=a[k].type==="twist"?Math.PI:l,z=Math.max(-Gm,Math.min(Gm,u[U*2]*L+u[U*2+1]*T));S[k]=Math.max(-V,Math.min(V,o[k]+z))}return S}const SC=[as.R2,as.R3,as.R4,as.R5,as.R6],Wm=mn*2+SC.reduce((t,e)=>t+e,0),MC=new F(0,0,0),EC=new nn(0,0,0,1);class TC{constructor(e,n,i,r,s){this.scene=e,this.robotFK=n,this.interaction=i,this.getStore=r,this.act=s,this._telemetry=new xC(6),this._raf=null,this._lastRootId="R1",this._activeDragRodId=null,this._activeDragNdc=new ye,this._pickupOffset={x:0,y:0},this._homeAnim=null,this._connectMode=!1,this.extraTick=null,this._prevAngles=[0,0,0,0,0,0],this._wasColliding=!1,this.getOtherModuleBounds=null,_t.getArmNodes=()=>this.robotFK.getNodePositions().map(o=>({x:o.x,y:o.y,z:o.z})),this._setupInteractionCallbacks()}_ikDragNode(e,n){return e>n?Math.min(e,5):Math.max(e-1,0)}_activeJoints(e,n,i){const r=[];if(e>n)for(let s=n;s<i;s++)r.push(s);else for(let s=i+1;s<n;s++)r.push(s);return r}_setupInteractionCallbacks(){this.interaction.callbacks.onHoverChange=(e,n)=>{this.robotFK.setHoverHighlight(e,n)},this.interaction.callbacks.onRootClick=e=>{const n=this.getStore();if(e===n.activeRootId)return;const i=n.mode||"horizontal",{newAngles:r,rootPos:s,rootQuat:o}=this.robotFK.computeAnglesForRoot(e,i);this.act.setRootAndAngles(e,r),this._lastRootId=e,this.robotFK.rebuild(e,r,s,o),this._telemetry.seed(r)},this.interaction.callbacks.onDragStart=(e,n)=>{this.scene.setOrbitEnabled(!1),this._homeAnim=null;const i=this.getStore(),r=Xi.indexOf(i.activeRootId),s=Xi.indexOf(e),o=this._ikDragNode(s,r),l=this.robotFK.getNodePositions()[o],c=new F(l.x,l.y,l.z).project(this.scene.camera);this._pickupOffset=n?{x:n.x-c.x,y:n.y-c.y}:{x:0,y:0},n&&this._activeDragNdc.set(n.x,n.y),this._activeDragRodId=e},this.interaction.callbacks.onDrag=(e,n,i,r)=>{r&&this._activeDragNdc.set(r.x,r.y)},this.interaction.callbacks.onDragEnd=()=>{this._activeDragRodId=null,this.scene.setOrbitEnabled(!0)}}_runIKStep(e,n){const i=this.getStore(),r=i.mode||"horizontal",s=Xi.indexOf(i.activeRootId),o=Xi.indexOf(e);if(o===s)return;const a=this._ikDragNode(o,s),l=this._activeJoints(o,s,a);if(l.length===0)return;const f=this.robotFK.getNodePositions()[a],d=new F(f.x,f.y,f.z),h=this.robotFK.getJointWorldData(r);return yC(d,h,l,this.scene.camera,{x:n.x,y:n.y},this._pickupOffset,i.jointAngles,Nt,ul,.008,.5)}swapRobotFK(e){this.robotFK=e}setConnectMode(e){this._connectMode=e}start(){const e=n=>{this._raf=requestAnimationFrame(e),this._frame(n)};this._raf=requestAnimationFrame(e)}stop(){this._raf&&cancelAnimationFrame(this._raf)}_frame(e){const n=this.getStore(),i=n.mode||"horizontal";if(this.extraTick&&this.extraTick(),n.pendingHome&&!this._connectMode){this.act.clearPendingHome(),this._activeDragRodId=null;let m=[...n.jointAngles],u=this.robotFK.robotGroup.position.clone(),v=this.robotFK.robotGroup.quaternion.clone();if(n.activeRootId!=="R1"){const{newAngles:b,rootPos:C,rootQuat:A}=this.robotFK.computeAnglesForRoot("R1",i);this.act.setRootAndAngles("R1",b),this._lastRootId="R1",this.robotFK.rebuild("R1",b,C,A),this._telemetry.seed(b),m=b,u=C.clone(),v=A.clone()}const _=Math.max(.01,...m.map(b=>Math.abs(b))),M=Math.max(1500,600+_*(2200/Math.PI));this._homeAnim={startAngles:m,startPos:u,startQuat:v,startTime:e,duration:M}}if(this._homeAnim){const{startAngles:m,startPos:u,startQuat:v,startTime:_,duration:M}=this._homeAnim,b=Math.min((e-_)/M,1),C=b<.5?4*b*b*b:1-Math.pow(-2*b+2,3)/2,A=m.map(z=>z*(1-C));for(let z=0;z<6;z++)this.act.setJointAngle(z,A[z]);this.robotFK.updateAngles(A,i),this.robotFK.robotGroup.position.lerpVectors(u,MC,C),this.robotFK.robotGroup.quaternion.slerpQuaternions(v,EC,C);const L=A.map((z,O)=>Math.abs(z)>=Nt[O].limit-.01),T=this._telemetry.update(A,L,e);this.act.setJointTelemetry(T);for(let z=0;z<Nt.length;z++)this.robotFK.setLimitHighlight(Nt[z].id,L[z]);const S=this.robotFK.getEndEffectorWorld(),U=this.robotFK.robotGroup.position,k=S.x-U.x,D=S.y-U.y,V=S.z-U.z;if(this.act.updateEndEffector(S,Math.min(Math.sqrt(k*k+D*D+V*V)/Wm,1)*100),this.scene.render(),b>=1){this._homeAnim=null;for(let z=0;z<6;z++)this.act.setJointAngle(z,0);this.robotFK.updateAngles([0,0,0,0,0,0],i),this.robotFK.robotGroup.position.set(0,0,0),this.robotFK.robotGroup.quaternion.identity(),this._telemetry.seed([0,0,0,0,0,0])}return}let r=n.jointAngles;if(n.activeRootId!==this._lastRootId){const{newAngles:m,rootPos:u,rootQuat:v}=this.robotFK.computeAnglesForRoot(n.activeRootId,i);this.act.setRootAndAngles(n.activeRootId,m),this._lastRootId=n.activeRootId,this.robotFK.rebuild(n.activeRootId,m,u,v),this._telemetry.seed(m),r=m,this._prevAngles=[...m]}let s=[...r],o=!1;if(this._activeDragRodId&&!this._connectMode){const m=this._runIKStep(this._activeDragRodId,this._activeDragNdc);m&&(s=m,o=!0)}this.robotFK.updateAngles(s,i);{let m=!1;if(this.getOtherModuleBounds&&!m){const u=new Mi().setFromObject(this.robotFK.robotGroup);for(const v of this.getOtherModuleBounds())if(u.clone().expandByScalar(-.05).intersectsBox(v.clone().expandByScalar(-.05))){m=!0;break}}if(!m){const u=["R1","R2","R3","R4","R5","R6","R7"],v=this.robotFK.getLinkBounds();e:for(let _=0;_<u.length;_++)for(let M=_+3;M<u.length;M++){const b=v[u[_]],C=v[u[M]];if(b&&C&&b.clone().expandByScalar(-.02).intersectsBox(C.clone().expandByScalar(-.02))){m=!0;break e}}}if(m)this.robotFK.updateAngles(this._prevAngles,i),r=this._prevAngles,this._wasColliding||this.act.setAllAngles(this._prevAngles);else{if(o){for(let u=0;u<6;u++)this.act.setJointAngle(u,s[u]);r=s}this._prevAngles=[...r]}this._wasColliding=m,this.act.setCollision(m)}const a=r.map((m,u)=>Math.abs(m)>=Nt[u].limit-.01),l=this._telemetry.update(r,a,e);this.act.setJointTelemetry(l);for(let m=0;m<Nt.length;m++)this.robotFK.setLimitHighlight(Nt[m].id,a[m]);const c=this.robotFK.getEndEffectorWorld(),f=this.robotFK.robotGroup.position,d=c.x-f.x,h=c.y-f.y,p=c.z-f.z,g=Math.sqrt(d*d+h*h+p*p),x=Math.min(g/Wm,1)*100;this.act.updateEndEffector(c,x),this.scene.render()}}const os=new s_;function wC(t,e,n){var u,v;const i=(u=n.get(t.moduleId))==null?void 0:u.robotFK,r=(v=n.get(e.moduleId))==null?void 0:v.robotFK;if(!i||!r)return;i.robotGroup.updateMatrixWorld(!0),r.robotGroup.updateMatrixWorld(!0);const s=i.getFaceIndicatorMeshes().find(_=>_.userData.faceKey===t.faceKey),o=r.getFaceIndicatorMeshes().find(_=>_.userData.faceKey===e.faceKey);if(!s||!o)return;s.updateMatrixWorld(!0),o.updateMatrixWorld(!0);const a=s.getWorldPosition(new F),l=new F(0,0,1).transformDirection(s.matrixWorld).normalize(),c=o.getWorldPosition(new F),f=new F(0,0,1).transformDirection(o.matrixWorld).normalize(),d=l.clone().negate(),h=new nn().setFromUnitVectors(f,d),p=h.clone().multiply(r.robotGroup.quaternion),g=r.robotGroup.position.clone(),x=c.clone().sub(g),m=a.clone().sub(x.applyQuaternion(h));r.robotGroup.position.copy(m),r.robotGroup.quaternion.copy(p),qe.getState().applyJoin(e.moduleId,m,p)}function Xm(t,e){for(const[n,{robotFK:i}]of e)if(i.interactables.includes(t)||i.getFaceIndicatorMeshes().includes(t))return n;return null}function AC(){const t=J.useRef(null),e=J.useRef(null),n=J.useRef(null),i=J.useRef(null),r=J.useRef(new Map),s=J.useRef(null);J.useEffect(()=>{const d=t.current;if(!d)return;const h=pn.getState(),p=qe.getState(),g=new aC(d);e.current=g;const x=p.modules[0],m=new zm(g.scene);m.robotGroup.position.set(x.position.x,x.position.y,x.position.z),r.current.set(x.id,{robotFK:m}),s.current=m;const u=new pC(d,g.camera,()=>{var b;return((b=s.current)==null?void 0:b.interactables)??[]},{});i.current=u;const v={setJointAngle:h.setJointAngle,setJointTelemetry:h.setJointTelemetry,setStatus:h.setStatus,updateEndEffector:h.updateEndEffector,setRootRod:h.setRootRod,setRootAndAngles:h.setRootAndAngles,clearPendingHome:h.clearPendingHome,setAllAngles:h.setAllAngles,setCollision:h.setCollision},_=new TC(g,m,u,()=>pn.getState(),v);_.getOtherModuleBounds=()=>{const b=qe.getState().activeModuleId,C=[];for(const[A,{robotFK:L}]of r.current){if(A===b)continue;L.robotGroup.updateMatrixWorld(!0);const T=new Mi().setFromObject(L.robotGroup);T.isEmpty()||C.push(T)}return C},_.extraTick=()=>{const b=qe.getState(),C=b.activeModuleId;for(const[A,{robotFK:L}]of r.current){if(A===C)continue;const T=b.modules.find(S=>S.id===A);T&&L.updateAngles(T.angles,T.mode??"horizontal")}},n.current=_,_.start(),_t.getArmNodes=()=>{const b=new Mi;let C=!1;for(const[,{robotFK:L}]of r.current){L.robotGroup.updateMatrixWorld(!0);const T=new Mi().setFromObject(L.robotGroup);T.isEmpty()||(b.union(T),C=!0)}if(!C)return[];const A=new F;return b.getCenter(A),[{x:b.min.x,y:b.min.y,z:b.min.z},{x:b.max.x,y:b.max.y,z:b.max.z},{x:A.x,y:A.y,z:A.z}]};const M=setTimeout(()=>{_t.fitCamera&&_t.fitCamera()},300);return()=>{clearTimeout(M),_.stop(),u.dispose(),g.dispose(),r.current.clear(),e.current=null,n.current=null,i.current=null}},[]);const o=qe(d=>d.modules.map(h=>h.id).join(","));J.useEffect(()=>{const d=e.current;if(!d)return;const h=qe.getState();for(const g of h.modules)if(!r.current.has(g.id)){const x=new zm(d.scene);x.robotGroup.position.set(g.position.x,g.position.y,g.position.z),x.robotGroup.quaternion.set(g.quaternion.x,g.quaternion.y,g.quaternion.z,g.quaternion.w),x.updateAngles(g.angles,g.mode??"horizontal"),h.connectMode&&x.showFaceIndicators(!0),r.current.set(g.id,{robotFK:x})}for(const[g,{robotFK:x}]of r.current)h.modules.find(m=>m.id===g)||(d.scene.remove(x.robotGroup),r.current.delete(g));const p=setTimeout(()=>{_t.fitCamera&&_t.fitCamera()},80);return()=>clearTimeout(p)},[o]);const a=qe(d=>d.activeModuleId);J.useEffect(()=>{var v;const d=n.current,h=e.current;if(!d||!h)return;const p=qe.getState(),g=pn.getState(),x=[...r.current.keys()].find(_=>{var M;return((M=r.current.get(_))==null?void 0:M.robotFK)===s.current});if(x&&x!==a){const _=s.current;p.saveModuleState(x,{angles:[...g.jointAngles],activeRootId:g.activeRootId,position:_.robotGroup.position.clone(),quaternion:_.robotGroup.quaternion.clone(),mode:g.mode})}const m=p.modules.find(_=>_.id===a);if(!m)return;const u=(v=r.current.get(a))==null?void 0:v.robotFK;u&&(u.robotGroup.position.set(m.position.x,m.position.y,m.position.z),u.robotGroup.quaternion.set(m.quaternion.x,m.quaternion.y,m.quaternion.z,m.quaternion.w),g.setRootAndAngles(m.activeRootId,m.angles),u.rebuild(m.activeRootId,m.angles,u.robotGroup.position.clone(),u.robotGroup.quaternion.clone()),s.current=u,d.swapRobotFK(u),p.connectMode&&u.showFaceIndicators(!0))},[a]);const l=qe(d=>d.connectMode);J.useEffect(()=>{const d=i.current,h=n.current;if(!(!d||!h)){d.paused=l,h.setConnectMode(l);for(const[,{robotFK:p}]of r.current)p.showFaceIndicators(l),l||p.resetFaceHighlights()}},[l]);const c=qe(d=>d.disconnectMode);J.useEffect(()=>{const d=i.current,h=n.current;!d||!h||l||(d.paused=c,h.setConnectMode(c))},[c,l]),J.useEffect(()=>{const d=t.current;if(!d||!c)return;let h=0,p=0;const g=m=>{h=m.clientX,p=m.clientY},x=m=>{var U;const u=m.clientX-h,v=m.clientY-p;if(Math.sqrt(u*u+v*v)>5)return;const _=e.current;if(!_)return;const M=d.getBoundingClientRect(),b=(m.clientX-M.left)/M.width*2-1,C=-((m.clientY-M.top)/M.height)*2+1;os.setFromCamera({x:b,y:C},_.camera);const A=[];for(const[,{robotFK:k}]of r.current)A.push(...k.interactables);const L=os.intersectObjects(A,!1);if(!L.length)return;const T=Xm(L[0].object,r.current);if(!T)return;const S=qe.getState();if(!S.dSel1)S.setDSel1(T);else if(S.dSel1===T)S.setDisconnectError("Select a DIFFERENT module."),setTimeout(()=>qe.getState().setDisconnectError(null),1500);else{S.setDSel2(T);const k=(U=r.current.get(T))==null?void 0:U.robotFK;if(k){const D=S.modules,V=new Set(D.filter(O=>O.id!==T).map(O=>Math.round(O.position.z/4)));let z=0;for(;V.has(z);)z++;k.robotGroup.position.set(0,0,z*4),k.robotGroup.quaternion.identity()}S.applyDisconnect(T)}};return d.addEventListener("mousedown",g),d.addEventListener("mouseup",x),()=>{d.removeEventListener("mousedown",g),d.removeEventListener("mouseup",x)}},[c]);const f=qe(d=>d.deleteMode);return J.useEffect(()=>{const d=i.current,h=n.current;!d||!h||!l&&!c&&(d.paused=f,h.setConnectMode(f))},[f,l,c]),J.useEffect(()=>{const d=t.current;if(!d||!f)return;let h=0,p=0;const g=m=>{h=m.clientX,p=m.clientY},x=m=>{const u=m.clientX-h,v=m.clientY-p;if(Math.sqrt(u*u+v*v)>5)return;const _=e.current;if(!_)return;const M=d.getBoundingClientRect(),b=(m.clientX-M.left)/M.width*2-1,C=-((m.clientY-M.top)/M.height)*2+1;os.setFromCamera({x:b,y:C},_.camera);const A=[];for(const[,{robotFK:U}]of r.current)A.push(...U.interactables);const L=os.intersectObjects(A,!1);if(!L.length)return;const T=Xm(L[0].object,r.current);if(!T)return;const S=qe.getState();S.modules.length<=1||(S.setDeleteMode(!1),S.removeModule(T))};return d.addEventListener("mousedown",g),d.addEventListener("mouseup",x),()=>{d.removeEventListener("mousedown",g),d.removeEventListener("mouseup",x)}},[f]),J.useEffect(()=>{const d=t.current;if(!d||!l)return;let h=0,p=0;const g=m=>{h=m.clientX,p=m.clientY},x=m=>{var V;const u=m.clientX-h,v=m.clientY-p;if(Math.sqrt(u*u+v*v)>5)return;const _=e.current;if(!_)return;const M=d.getBoundingClientRect(),b=(m.clientX-M.left)/M.width*2-1,C=-((m.clientY-M.top)/M.height)*2+1;os.setFromCamera({x:b,y:C},_.camera);const A=[];for(const[z,{robotFK:O}]of r.current)for(const Z of O.getFaceIndicatorMeshes())Z.userData.moduleId=z,A.push(Z);const L=os.intersectObjects(A,!1);if(!L.length)return;const T=L[0].object,S=T.userData.faceKey,U=T.userData.moduleId,k=(V=r.current.get(U))==null?void 0:V.robotFK;if(!k)return;const D=qe.getState();D.face1?U===D.face1.moduleId?(D.setConnectError("Select a face from a DIFFERENT module."),k.setFaceHighlight(S,"error"),setTimeout(()=>{k.setFaceHighlight(S,"normal"),qe.getState().setConnectError(null)},1500)):(D.setFace2({moduleId:U,faceKey:S}),k.setFaceHighlight(S,"selected2"),wC(D.face1,{moduleId:U,faceKey:S},r.current)):(D.setFace1({moduleId:U,faceKey:S}),k.setFaceHighlight(S,"selected1"))};return d.addEventListener("mousedown",g),d.addEventListener("mouseup",x),()=>{d.removeEventListener("mousedown",g),d.removeEventListener("mouseup",x)}},[l]),y.jsx("canvas",{ref:t,style:{display:"block",width:"100%",height:"100%"}})}const $m={idle:{label:"IDLE",color:"#334455",glow:"#00aaff44",dot:"#00aaff",pulse:!1},solving:{label:"FK ACTIVE",color:"#1a3322",glow:"#00ff8844",dot:"#00ff88",pulse:!0},limit_hit:{label:"JOINT LIMIT",color:"#331100",glow:"#ff440044",dot:"#ff4400",pulse:!0}};function CC(){const t=pn(n=>n.status),e=$m[t]??$m.idle;return y.jsxs("div",{className:`status-bar fade-in ${e.pulse?"pulse":""}`,style:{"--status-color":e.color,"--status-glow":e.glow},children:[y.jsx("div",{className:"status-dot",style:{background:e.dot,boxShadow:`0 0 8px ${e.dot}`,animation:e.pulse?"dotPulse 0.8s ease-in-out infinite alternate":"none"}}),y.jsx("span",{className:"status-label",style:{color:e.dot},children:e.label})]})}const Ld=110,hi=Ld/2,Ym=40,RC=14,bC=10,qm=[{key:"+X",dir:[1,0,0],label:"X",color:"#e84040",glow:"#ff000044",isPos:!0},{key:"-X",dir:[-1,0,0],label:"-X",color:"#cc6666",glow:"#cc000022",isPos:!1},{key:"+Y",dir:[0,1,0],label:"Y",color:"#22cc55",glow:"#00ff4444",isPos:!0},{key:"-Y",dir:[0,-1,0],label:"-Y",color:"#66bb88",glow:"#00cc2222",isPos:!1},{key:"+Z",dir:[0,0,1],label:"Z",color:"#4488ff",glow:"#0044ff44",isPos:!0},{key:"-Z",dir:[0,0,-1],label:"-Z",color:"#7799cc",glow:"#0022cc22",isPos:!1}],PC={"+X":{pos:{x:14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"-X":{pos:{x:-14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"+Y":{pos:{x:0,y:14,z:.5},lookAt:{x:0,y:0,z:0}},"-Y":{pos:{x:.5,y:-5,z:6},lookAt:{x:0,y:0,z:0}},"+Z":{pos:{x:0,y:1.5,z:14},lookAt:{x:0,y:0,z:0}},"-Z":{pos:{x:0,y:1.5,z:-14},lookAt:{x:0,y:0,z:0}}},Km={pos:{x:0,y:7,z:9},lookAt:{x:0,y:0,z:0}},mo=new F;function LC(){const[t,e]=J.useState([]),[n,i]=J.useState(null),r=J.useRef(null),s=J.useRef(!1),o=J.useRef({x:0,y:0}),a=J.useRef(null);J.useEffect(()=>{const p=()=>{const g=_t.camera;if(g){g.updateMatrixWorld();const x=qm.map(m=>(mo.set(...m.dir),mo.transformDirection(g.matrixWorldInverse),{...m,sx:hi+mo.x*Ym,sy:hi-mo.y*Ym,depth:mo.z}));x.sort((m,u)=>u.depth-m.depth),e(x)}r.current=requestAnimationFrame(p)};return r.current=requestAnimationFrame(p),()=>cancelAnimationFrame(r.current)},[]);const l=J.useCallback(p=>{const g=PC[p];g&&_t.animateTo&&_t.animateTo(g.pos,g.lookAt)},[]),c=J.useCallback(()=>{_t.animateTo&&_t.animateTo(Km.pos,Km.lookAt)},[]),f=J.useCallback(p=>{var g;p.stopPropagation(),(g=a.current)==null||g.setPointerCapture(p.pointerId),s.current=!0,o.current={x:p.clientX,y:p.clientY}},[]),d=J.useCallback(p=>{if(!s.current)return;const g=p.clientX-o.current.x,x=p.clientY-o.current.y;o.current={x:p.clientX,y:p.clientY},_t.orbitDelta&&_t.orbitDelta(g,x)},[]),h=J.useCallback(p=>{var g;s.current=!1,(g=a.current)==null||g.releasePointerCapture(p.pointerId)},[]);return y.jsxs("div",{className:"gizmo-wrap",children:[y.jsxs("svg",{ref:a,width:Ld,height:Ld,style:{overflow:"visible",display:"block",cursor:s.current?"grabbing":"grab"},onPointerMove:d,onPointerUp:h,children:[y.jsx("defs",{children:y.jsxs("radialGradient",{id:"gizmo-bg",cx:"50%",cy:"50%",r:"50%",children:[y.jsx("stop",{offset:"0%",stopColor:"rgba(255,255,255,0.22)"}),y.jsx("stop",{offset:"100%",stopColor:"rgba(200,215,235,0.06)"})]})}),y.jsx("circle",{cx:hi,cy:hi,r:hi-4,fill:"url(#gizmo-bg)",stroke:"rgba(180,200,225,0.4)",strokeWidth:"1",style:{cursor:"grab"},onPointerDown:f}),t.map(p=>{const g=p.depth<0;return y.jsx("line",{x1:hi,y1:hi,x2:p.sx,y2:p.sy,stroke:p.color,strokeWidth:g?2:1,opacity:g?.85:.28,style:{pointerEvents:"none"}},`ln-${p.key}`)}),t.map(p=>{const g=p.depth<0,x=p.isPos?RC:bC,m=n===p.key,u=g?1:p.isPos?.42:.2;return y.jsxs("g",{opacity:u,style:{cursor:"pointer"},onMouseEnter:()=>i(p.key),onMouseLeave:()=>i(null),onClick:v=>{v.stopPropagation(),l(p.key)},children:[m&&y.jsx("circle",{cx:p.sx,cy:p.sy,r:x+5,fill:p.glow,stroke:p.color,strokeWidth:"1",opacity:"0.7"}),y.jsx("rect",{x:p.sx-x,y:p.sy-x,width:x*2,height:x*2,rx:p.isPos?4:3,fill:m||p.isPos?p.color:"rgba(200,215,235,0.75)",stroke:p.isPos?"rgba(255,255,255,0.4)":"rgba(120,140,170,0.3)",strokeWidth:"0.8"}),y.jsx("text",{x:p.sx,y:p.sy,textAnchor:"middle",dominantBaseline:"central",fontSize:p.isPos?9.5:7,fontWeight:"700",fontFamily:"'Share Tech Mono', monospace",fill:p.isPos?"white":"#334466",style:{pointerEvents:"none",userSelect:"none"},children:p.label})]},`dot-${p.key}`)}),y.jsx("circle",{cx:hi,cy:hi,r:"6",fill:"rgba(80,100,130,0.75)",stroke:"rgba(255,255,255,0.65)",strokeWidth:"1",style:{cursor:"pointer"},onClick:p=>{p.stopPropagation(),c()}})]}),y.jsx("div",{className:"gizmo-btn-row",children:["+X","+Y","+Z"].map(p=>{var g;return y.jsx("button",{className:"gizmo-axis-btn",onClick:()=>l(p),style:{"--ax-color":(g=qm.find(x=>x.key===p))==null?void 0:g.color},children:p},p)})})]})}function NC(){const t=J.useCallback(()=>{_t.fitCamera&&_t.fitCamera()},[]);return y.jsx("div",{className:"view-controls",children:y.jsxs("button",{className:"view-btn",onClick:t,title:"Fit arm in view",children:[y.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[y.jsx("rect",{x:"1",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),y.jsx("rect",{x:"9",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),y.jsx("rect",{x:"1",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),y.jsx("rect",{x:"9",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"})]}),"FIT"]})})}const DC=120;function IC(){const t=new Date,e=t.getHours().toString().padStart(2,"0"),n=t.getMinutes().toString().padStart(2,"0"),i=t.getSeconds().toString().padStart(2,"0"),r=t.getMilliseconds().toString().padStart(3,"0");return`${e}:${n}:${i}.${r}`}function go(t,e,n){return{id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:IC(),level:t,src:e,msg:n}}function vo(t,e){return t.length>=DC?[...t.slice(1),e]:[...t,e]}const Qe=Cf((t,e)=>({espUrl:"http://nischaylap.local",connected:!1,latencyMs:null,servoOnlineCount:0,pendingAngles:null,lastSentAngles:{},simLog:[],ctrlLog:[],stats:{queued:0,sent:0,failed:0},avgVoltage:null,totalCurrentMA:null,overcurrentServos:[],setEspUrl:n=>t({espUrl:n}),setConnected:(n,i)=>t({connected:n,latencyMs:i??null}),setServoOnlineCount:n=>t({servoOnlineCount:n}),setAvgVoltage:n=>t({avgVoltage:n}),setTotalCurrentMA:n=>t({totalCurrentMA:n}),setOvercurrentServos:n=>t({overcurrentServos:n}),queueAngles:n=>{const{lastSentAngles:i,stats:r}=e(),s={};for(const[a,l]of Object.entries(n)){const c=i[a];(c==null||Math.abs(l-c)>=.8)&&(s[a]=l)}if(!Object.keys(s).length)return!1;const o=Object.entries(s).sort(([a],[l])=>Number(a)-Number(l)).map(([a,l])=>`J${a}→${Number(l).toFixed(1)}°`).join(" ");return t(a=>({pendingAngles:{...n},stats:{...a.stats,queued:a.stats.queued+1},simLog:vo(a.simLog,go("queued","SIM",`TX ${o}`))})),!0},consumeAngles:()=>t({pendingAngles:null}),markSent:n=>t(i=>({lastSentAngles:{...i.lastSentAngles,...n}})),simSent:n=>t(i=>({stats:{...i.stats,sent:i.stats.sent+1},simLog:vo(i.simLog,go("sent","ESP",`OK  ${n}`))})),simFailed:n=>t(i=>({stats:{...i.stats,failed:i.stats.failed+1},simLog:vo(i.simLog,go("error","ERR",`ERR ${n}`))})),simOffline:n=>t(i=>({simLog:vo(i.simLog,go("offline","OFF",`ESP OFFLINE — ${n}`))})),pushCtrlLog:(n,i,r)=>t(s=>({ctrlLog:vo(s.ctrlLog,go(n,i,r))})),clearSimLog:()=>t({simLog:[]}),clearCtrlLog:()=>t({ctrlLog:[]}),resetStats:()=>t({stats:{queued:0,sent:0,failed:0}})})),Nn=[{id:1,label:"J1",name:"CUBE LEFT",type:"twist",color:"#f59e0b"},{id:2,label:"J2",name:"JOINT 1",type:"bend",color:"#6ee7ff"},{id:3,label:"J3",name:"JOINT 2",type:"bend",color:"#a78bfa"},{id:4,label:"J4",name:"WRIST",type:"twist",color:"#fb923c"},{id:5,label:"J5",name:"JOINT 3",type:"bend",color:"#34d399"},{id:6,label:"J6",name:"CUBE RIGHT",type:"twist",color:"#f59e0b"}],UC=(()=>{const t={};let e=0,n=0;for(const i of Nn)i.type==="twist"?t[i.id]={type:"twist",num:++e}:t[i.id]={type:"bend",num:++n};return t})(),FC=120,OC=50,Zm=55,Qm=2e3,a_=8e3;function bu(t,e=1){return t==null||!Number.isFinite(Number(t))?"—":Number(t).toFixed(e)}function Jm(t,e){const n=[...t,e];return n.length>FC&&n.shift(),n}function kC(){const t={};for(const e of Nn)t[e.id]={history:{current:[],load:[]}};return t}function zC(t){return Nn.reduce((e,n)=>{var i;return e+(((i=t[n.id])==null?void 0:i.currentmA)??0)},0)}function BC(t){var i;let e=null,n=-1/0;for(const r of Nn){const s=(i=t[r.id])==null?void 0:i.tempC;s!=null&&s>n&&(n=s,e=r.label)}return e?`${e} (${n}°C)`:"—"}function HC(t){return Nn.filter(e=>{var n;return(n=t[e.id])==null?void 0:n.connected}).length}function VC(t,e){const n=[];for(const i of Nn){const r=t[i.id];r&&(r.tempC!=null&&r.tempC>Zm&&n.push({id:`temp-${i.id}`,kind:"warn",msg:`${i.label} — ${r.tempC}°C (thermal warning > ${Zm}°C)`}),r.currentmA!=null&&r.currentmA>Qm&&n.push({id:`cur-${i.id}`,kind:"warn",msg:`${i.label} — ${r.currentmA.toFixed(0)} mA (high load > ${Qm} mA)`}))}return e>a_&&n.push({id:"total-cur",kind:"bad",msg:`System draw ${(e/1e3).toFixed(1)} A — near power limit`}),n}function eg({values:t,color:e}){const i="scg"+J.useId().replace(/[^a-zA-Z0-9]/g,"");if(!t||t.length<2)return y.jsx("div",{style:{height:66,display:"flex",alignItems:"center",justifyContent:"center",color:"#aabcd0",fontSize:11},children:"no data"});const r=280,s=66,o=Math.min(...t),l=Math.max(...t)-o||1,c=x=>s-5-(x-o)/l*(s-10),f=t.map((x,m)=>`${(m/(t.length-1)*r).toFixed(1)},${c(x).toFixed(1)}`),d=f.join(" "),h=`0,${s} ${d} ${r},${s}`,[p,g]=f[f.length-1].split(",").map(Number);return y.jsxs("svg",{width:"100%",height:s,viewBox:`0 0 ${r} ${s}`,preserveAspectRatio:"none",children:[y.jsx("defs",{children:y.jsxs("linearGradient",{id:i,x1:"0",y1:"0",x2:"0",y2:"1",children:[y.jsx("stop",{offset:"0%",stopColor:e,stopOpacity:.38}),y.jsx("stop",{offset:"100%",stopColor:e,stopOpacity:0})]})}),y.jsx("polygon",{points:h,fill:`url(#${i})`}),y.jsx("polyline",{points:d,fill:"none",stroke:e,strokeWidth:1.8,style:{filter:`drop-shadow(0 0 3px ${e}99)`}}),y.jsx("circle",{cx:p,cy:g,r:3,fill:e,style:{filter:`drop-shadow(0 0 5px ${e})`}})]})}function GC({current:t,target:e,color:n,size:i=100,lo:r=0,hi:s=360,onDrag:o}){const a=i,l=a/2,c=l-7,f=6+c,d=f+12,h=J.useRef(null),p=J.useRef(!1),g=J.useRef(0),x=(ee,ue)=>{const be=(ee+90)*(Math.PI/180);return[l+ue*Math.cos(be),f+ue*Math.sin(be)]},m=ee=>(270-(1-(ee-r)/(s-r))*180)%360,[u,v]=x(270,c),[_,M]=x(90,c),[b,C]=x(0,c),A=`M ${u.toFixed(2)} ${v.toFixed(2)} A ${c} ${c} 0 0 0 ${_.toFixed(2)} ${M.toFixed(2)}`,L=t!=null?m(Math.max(r,Math.min(s,t))):null,[T,S]=L!=null?x(L,c):[null,null],U=e!=null?m(Math.max(r,Math.min(s,e))):null,[k,D]=U!=null?x(U,c):[null,null];let V=null;t!=null&&L!=null&&t>r+.5&&(V=`M ${u.toFixed(2)} ${v.toFixed(2)} A ${c} ${c} 0 0 0 ${T.toFixed(2)} ${S.toFixed(2)}`);const z=J.useCallback(ee=>{if(!h.current)return null;const ue=h.current.getBoundingClientRect(),be=ee.clientX-ue.left-l,K=ee.clientY-ue.top-f;let ne=(Math.atan2(be,-K)*180/Math.PI+360)%360;if(ne>90&&ne<270)return ne>180?r:s;let he=ne>=270?ne-270:ne+90;return Math.max(r,Math.min(s,r+he/180*(s-r)))},[l,f,r,s]),O=J.useCallback(ee=>{if(!o)return;ee.currentTarget.setPointerCapture(ee.pointerId),p.current=!0;const ue=z(ee);ue!=null&&(g.current=Date.now(),o(ue))},[o,z]),Z=J.useCallback(ee=>{if(!p.current||!o)return;const ue=Date.now();if(ue-g.current<60)return;g.current=ue;const be=z(ee);be!=null&&o(be)},[o,z]),I=J.useCallback(()=>{p.current=!1},[]),G=!!o,X=f-c*.28;return y.jsxs("svg",{ref:h,width:a,height:d,viewBox:`0 0 ${a} ${d}`,style:{flexShrink:0,overflow:"visible",cursor:G?"crosshair":"default",touchAction:"none"},onPointerDown:G?O:void 0,onPointerMove:G?Z:void 0,onPointerUp:G?I:void 0,children:[G&&y.jsx("rect",{x:0,y:0,width:a,height:d,fill:"transparent"}),y.jsx("path",{d:A,fill:"none",stroke:"#dde6f0",strokeWidth:7,strokeLinecap:"round"}),V&&y.jsx("path",{d:V,fill:"none",stroke:n,strokeWidth:7,strokeLinecap:"round",style:{filter:`drop-shadow(0 0 4px ${n}88)`}}),y.jsx("line",{x1:(b-4).toFixed(2),y1:C.toFixed(2),x2:(b+4).toFixed(2),y2:C.toFixed(2),stroke:"#b8c8dc",strokeWidth:2.5,strokeLinecap:"round"}),U!=null&&y.jsx("circle",{cx:k.toFixed(2),cy:D.toFixed(2),r:4,fill:"rgba(255,255,255,0.9)",stroke:n,strokeWidth:2}),L!=null&&(()=>{const[ee,ue]=x(L,c);return y.jsx("circle",{cx:ee.toFixed(2),cy:ue.toFixed(2),r:G?7:5,fill:n,stroke:"white",strokeWidth:2.5,style:{filter:`drop-shadow(0 0 6px ${n})`}})})(),y.jsx("text",{x:l,y:X,textAnchor:"middle",dominantBaseline:"middle",fill:t!=null?n:"#bbc8d8",fontSize:a*.22,fontWeight:"800",fontFamily:"'Courier New', monospace",children:t!=null?Math.round(t):"—"}),y.jsx("text",{x:l,y:X+a*.155,textAnchor:"middle",fill:"#8aa0be",fontSize:a*.115,fontFamily:"inherit",fontWeight:"600",children:"DEG"})]})}function jC({alerts:t,onDismiss:e}){return t.length===0?null:y.jsx("div",{className:"sc-alerts",children:t.map(n=>y.jsxs("div",{className:`sc-alert sc-alert-${n.kind}`,children:[y.jsx("span",{className:"sc-alert-icon",children:n.kind==="bad"?"🔴":"🟡"}),y.jsx("span",{className:"sc-alert-msg",children:n.msg}),y.jsx("button",{className:"sc-alert-dismiss",onClick:()=>e(n.id),children:"×"})]},n.id))})}function WC({def:t,data:e,onCmd:n}){var C,A;const[i,r]=J.useState("180"),[s,o]=J.useState(10),[a,l]=J.useState(20),c=t.color,f=(e==null?void 0:e.connected)??!1,d=(e==null?void 0:e.moving)??!1,h=(e==null?void 0:e.torque)??!1,p=(e==null?void 0:e.mode)??"—",g=t.type==="twist"?0:80,x=t.type==="twist"?360:280,m=()=>n(t.id,"pos",{angle:i,speed:s,acc:a}),u=()=>{r("180"),n(t.id,"pos",{angle:180,speed:s,acc:a})},v=L=>f?L:null,_=L=>f&&L!=null&&L>=0?L:null,M=[["Angle",v(e==null?void 0:e.currentAngle),"°",2],["Target",v(e==null?void 0:e.targetAngle),"°",2],["Speed",_(e==null?void 0:e.speed),"raw",0],["Pos",_(e==null?void 0:e.rawPos),"0-4k",0],["Load",_(e==null?void 0:e.loadAbs),"abs",0],["Current",v(e==null?void 0:e.currentmA),"mA",1],["Voltage",v(e==null?void 0:e.voltageV),"V",1],["Temp",v(e==null?void 0:e.tempC),"°C",0]],b=p==="Position"?v(e==null?void 0:e.targetAngle):null;return y.jsxs("div",{className:"sc-card",style:{"--sc-accent":c},children:[y.jsx("div",{className:"sc-card-head",children:y.jsxs("div",{className:"sc-card-head-inner",children:[y.jsx(GC,{current:v(e==null?void 0:e.currentAngle),target:b,color:c,lo:g,hi:x,onDrag:L=>n(t.id,"pos",{angle:L.toFixed(1),speed:s,acc:a})}),y.jsxs("div",{className:"sc-card-info",children:[y.jsxs("div",{className:"sc-card-title",children:[y.jsx("span",{className:"sc-joint-mono",style:{background:`${c}18`,border:`1px solid ${c}55`,color:c},children:t.label}),y.jsx("span",{className:"sc-card-name",style:{color:c},children:t.name}),y.jsx("span",{className:"sc-card-type",children:t.type})]}),y.jsxs("div",{className:"sc-badges",children:[y.jsx("span",{className:`sc-badge ${f?"sc-badge-ok":"sc-badge-bad"}`,children:f?"ONLINE":"OFFLINE"}),y.jsx("span",{className:`sc-badge ${d?"sc-badge-warn":""}`,children:d?"MOVING":"IDLE"}),y.jsx("span",{className:`sc-badge ${h?"sc-badge-ok":"sc-badge-warn"}`,children:h?"TRQ ✓":"TRQ ✗"}),y.jsx("span",{className:"sc-badge",children:p})]})]})]})}),y.jsxs("div",{className:"sc-card-body",children:[y.jsxs("div",{className:"sc-controls",children:[y.jsxs("div",{className:"sc-field",children:[y.jsx("label",{children:"Current (°)"}),y.jsx("span",{className:"sc-angle-input",style:{color:v(e==null?void 0:e.currentAngle)!=null?c:"#bbc8d8",cursor:"default"},children:v(e==null?void 0:e.currentAngle)!=null?bu(v(e==null?void 0:e.currentAngle),1):"—"})]}),y.jsxs("div",{className:"sc-field",children:[y.jsx("label",{children:"Target (°)"}),y.jsx("input",{type:"number",className:"sc-angle-input",min:"0",max:"360",step:"0.1",value:i,onChange:L=>r(L.target.value),style:{color:c}})]}),y.jsxs("div",{className:"sc-field",children:[y.jsxs("label",{children:["Speed  ",y.jsx("span",{className:"sc-slider-val",style:{color:c},children:s})]}),y.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"10",value:s,onChange:L=>o(Number(L.target.value)),style:{"--sc-accent":c}})]}),y.jsxs("div",{className:"sc-field",children:[y.jsxs("label",{children:["Accel  ",y.jsx("span",{className:"sc-slider-val",style:{color:c},children:a})]}),y.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"100",value:a,onChange:L=>l(Number(L.target.value)),style:{"--sc-accent":c}})]})]}),y.jsxs("div",{className:"sc-btns",children:[y.jsx("button",{className:"sc-btn sc-btn-primary",onClick:m,children:"GO"}),t.type==="twist"&&y.jsxs(y.Fragment,{children:[y.jsx("button",{className:"sc-btn",onClick:()=>n(t.id,"cw"),children:"CW"}),y.jsx("button",{className:"sc-btn",onClick:()=>n(t.id,"ccw"),children:"CCW"}),y.jsx("button",{className:"sc-btn",onClick:()=>n(t.id,"wave"),children:"WAVE"})]}),y.jsx("button",{className:"sc-btn sc-btn-danger",onClick:()=>n(t.id,"stop"),children:"■ STOP"}),y.jsx("button",{className:"sc-btn",onClick:u,children:"180°"}),y.jsx("button",{className:"sc-btn",onClick:()=>n(t.id,"torqueToggle"),children:h?"⟲ T.OFF":"⟲ T.ON"})]}),y.jsx("div",{className:"sc-stats",children:M.map(([L,T,S,U])=>y.jsxs("div",{className:"sc-stat",children:[y.jsx("div",{className:"sc-stat-k",children:L}),y.jsx("div",{className:"sc-stat-v",style:{color:T!=null?c:"#bbc8d8"},children:T!=null?bu(T,U):"—"}),y.jsx("div",{className:"sc-stat-u",children:S})]},L))}),y.jsxs("div",{className:"sc-graphs",children:[y.jsxs("div",{className:"sc-graph-box",children:[y.jsxs("div",{className:"sc-graph-hdr",children:[y.jsx("span",{children:"CURRENT"}),y.jsx("span",{className:"sc-graph-val",style:{color:c},children:(e==null?void 0:e.currentmA)!=null?`${bu(e.currentmA,1)} mA`:"—"})]}),y.jsx(eg,{values:((C=e==null?void 0:e.history)==null?void 0:C.current)??[],color:c})]}),y.jsxs("div",{className:"sc-graph-box",children:[y.jsxs("div",{className:"sc-graph-hdr",children:[y.jsx("span",{children:"LOAD ABS"}),y.jsx("span",{className:"sc-graph-val",style:{color:c},children:(e==null?void 0:e.loadAbs)!=null?String(e.loadAbs):"—"})]}),y.jsx(eg,{values:((A=e==null?void 0:e.history)==null?void 0:A.load)??[],color:c})]})]})]})]})}function XC({onCmd:t,onEstop:e}){const n=Nn.map(r=>r.id),i=(r,s={})=>n.forEach(o=>t(o,r,s));return y.jsxs("div",{className:"sc-group-strip",children:[y.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:()=>i("pos",{angle:180,speed:5,acc:40}),children:"Home All"}),y.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:e,children:"⚡ E-STOP"}),y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueon"),children:"Torque ON"}),y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueoff"),children:"Torque OFF"})]})}function $C({servos:t,onCmd:e}){const[n,i]=J.useState([]),[r,s]=J.useState(!1),[o,a]=J.useState(-1),[l,c]=J.useState(1500),f=J.useRef(!1),d=()=>{const u=Nn.map(v=>{var _;return{id:v.id,label:v.label,angle:((_=t[v.id])==null?void 0:_.currentAngle)??180}});i(v=>[...v,u])},h=async()=>{if(!(r||n.length===0)){f.current=!1,s(!0);for(let u=0;u<n.length&&!f.current;u++){a(u);for(const{id:v,angle:_}of n[u])await e(v,"pos",{angle:Number(_).toFixed(2),speed:5,acc:20});await new Promise(v=>setTimeout(v,l))}a(-1),s(!1)}},p=()=>{f.current=!0,s(!1),a(-1)},g=u=>i(v=>v.filter((_,M)=>M!==u)),x=()=>{const u=new Blob([JSON.stringify(n,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(u),download:"robo4_sequence.json"}).click()},m=u=>{var M;const v=(M=u.target.files)==null?void 0:M[0];if(!v)return;const _=new FileReader;_.onload=b=>{try{const C=JSON.parse(b.target.result);Array.isArray(C)&&i(C)}catch{}},_.readAsText(v),u.target.value=""};return y.jsxs("div",{className:"sc-seq",children:[y.jsxs("div",{className:"sc-seq-hdr",children:[y.jsx("span",{children:"⟳ Sequence Recorder"}),y.jsxs("span",{className:"sc-seq-count",children:[n.length," frame",n.length!==1?"s":""]})]}),y.jsxs("div",{className:"sc-seq-controls",children:[y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:d,children:"+ Capture"}),r?y.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:p,children:"■ Stop"}):y.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:h,disabled:n.length===0,children:"▶ Play"}),y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:x,disabled:n.length===0,children:"↓ Export"}),y.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",y.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:m})]}),y.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:()=>i([]),disabled:n.length===0,children:"Clear"}),y.jsxs("label",{className:"sc-seq-delay-label",children:["Delay",y.jsx("input",{className:"sc-group-input",type:"number",min:"200",max:"10000",step:"100",value:l,onChange:u=>c(Number(u.target.value))}),"ms"]})]}),n.length>0&&y.jsx("div",{className:"sc-seq-frames",children:n.map((u,v)=>y.jsxs("div",{className:`sc-seq-frame ${o===v?"sc-seq-frame-active":""}`,children:[y.jsxs("span",{className:"sc-seq-frame-num",children:["#",v+1]}),u.map(({label:_,angle:M})=>y.jsxs("span",{className:"sc-seq-chip",children:[_," ",Math.round(M),"°"]},_)),y.jsx("button",{className:"sc-seq-del",onClick:()=>g(v),children:"×"})]},v))})]})}function YC({servos:t,onApply:e}){const[n,i]=J.useState(()=>{try{return JSON.parse(localStorage.getItem("sc_presets")||"[]")}catch{return[]}}),[r,s]=J.useState(""),o=d=>{i(d),localStorage.setItem("sc_presets",JSON.stringify(d))},a=()=>{const d=r.trim()||`Preset ${n.length+1}`,h=Nn.map(p=>{var g;return{id:p.id,angle:((g=t[p.id])==null?void 0:g.currentAngle)??180}});o([...n.filter(p=>p.name!==d),{name:d,snapshot:h}]),s("")},l=d=>o(n.filter(h=>h.name!==d)),c=()=>{const d=new Blob([JSON.stringify(n,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(d),download:"robo4_presets.json"}).click()},f=d=>{var g;const h=(g=d.target.files)==null?void 0:g[0];if(!h)return;const p=new FileReader;p.onload=x=>{try{const m=JSON.parse(x.target.result);Array.isArray(m)&&o([...n,...m.filter(u=>u.name&&u.snapshot)])}catch{}},p.readAsText(h),d.target.value=""};return y.jsxs("div",{className:"sc-presets",children:[y.jsxs("div",{className:"sc-presets-hdr",children:[y.jsx("span",{children:"⭐ Presets"}),y.jsx("span",{style:{color:"#8aa0be",fontWeight:400,fontSize:11},children:"snapshots all 6 servo angles"}),y.jsx("div",{style:{flex:1}}),y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:c,disabled:n.length===0,children:"↓ Export"}),y.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",y.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:f})]})]}),y.jsxs("div",{className:"sc-preset-row",children:[y.jsx("input",{className:"sc-preset-name-input",placeholder:"preset name…",value:r,onChange:d=>s(d.target.value),onKeyDown:d=>d.key==="Enter"&&a()}),y.jsx("button",{className:"sc-btn sc-btn-sm",onClick:a,children:"+ Save"}),n.map(d=>y.jsxs("span",{className:"sc-preset-chip",children:[y.jsx("span",{onClick:()=>e(d.snapshot),children:d.name}),y.jsx("span",{className:"sc-preset-del",onClick:()=>l(d.name),children:"×"})]},d.name)),n.length===0&&y.jsx("span",{style:{fontSize:12,color:"#aabcd0"},children:"no presets yet"})]})]})}const qC={SIM:"#f59e0b",USER:"#0077dd",ESP:"#009944",POLL:"#6366f1",OFF:"#f97316",ERR:"#dc2626",SYS:"#8aa0be"},KC={ok:"#009944",error:"#dc2626",warn:"#d97706",info:"#0077dd",cmd:"#6366f1",queued:"#8b5cf6",offline:"#f97316"};function ZC({log:t,onClear:e}){const n=J.useRef(null);return J.useEffect(()=>{var r;const i=(r=n.current)==null?void 0:r.parentElement;i&&(i.scrollTop=i.scrollHeight)},[t]),y.jsxs("div",{className:"sc-log",children:[y.jsxs("div",{className:"sc-log-hdr",children:[y.jsx("span",{children:"Debug Log"}),y.jsxs("span",{style:{display:"flex",gap:10,alignItems:"center"},children:[y.jsxs("span",{style:{color:"#8aa0be",fontWeight:400,fontSize:10},children:[t.length," entries · real-time"]}),y.jsx("button",{onClick:e,style:{background:"#f3f6fb",border:"1px solid #c8d4e4",borderRadius:5,padding:"1px 7px",fontSize:10,cursor:"pointer",color:"#5a7090"},children:"CLR"})]})]}),y.jsxs("div",{className:"sc-log-body",style:{maxHeight:220},children:[t.length===0&&y.jsx("div",{style:{padding:"10px 0",color:"#aabcd0",fontSize:11},children:"no activity — connect to ESP32 and drag arm or press buttons"}),t.map((i,r)=>y.jsxs("div",{className:"sc-log-entry",children:[y.jsx("span",{className:"sc-log-time",children:i.time}),y.jsxs("span",{className:"sc-log-src",style:{color:qC[i.src]??"#8aa0be"},children:["[",i.src??"?","]"]}),y.jsx("span",{style:{color:KC[i.level??i.kind]??"#5a7090",flex:1},children:i.msg})]},i.id??r)),y.jsx("div",{ref:n})]})]})}function QC(){const t=Qe(N=>N.espUrl),e=Qe(N=>N.pushCtrlLog),n=Qe(N=>N.clearCtrlLog),i=Qe(N=>N.ctrlLog),r=Qe(N=>N.pendingAngles),s=Qe(N=>N.consumeAngles),o=Qe(N=>N.markSent),a=Qe(N=>N.simSent),l=Qe(N=>N.simFailed),c=Qe(N=>N.simOffline),f=Qe(N=>N.setConnected),d=Qe(N=>N.setEspUrl),h=Qe(N=>N.setServoOnlineCount),p=Qe(N=>N.setAvgVoltage),g=Qe(N=>N.setTotalCurrentMA),x=Qe(N=>N.setOvercurrentServos),[m,u]=J.useState(t),[v,_]=J.useState(t),[M,b]=J.useState(!1),[C,A]=J.useState(null),[L,T]=J.useState("—"),[S,U]=J.useState(kC),[k,D]=J.useState(null),[V,z]=J.useState([]),O=J.useRef(null),Z=J.useRef(!1),I=J.useRef(new Set),G=J.useRef(!1),X=J.useRef(m);J.useEffect(()=>{G.current=M},[M]),J.useEffect(()=>{X.current=m},[m]),J.useCallback((N,xe="cmd",oe="USER")=>{e(xe,oe,N)},[e]);const ee=J.useCallback(async()=>{if(Z.current)return;Z.current=!0;const N=Date.now();try{const oe=await(await fetch(`${m}/api/telemetry`,{cache:"no-store",signal:AbortSignal.timeout(8e3)})).json(),Ve=Date.now()-N;if(A(Ve),oe!=null&&oe.ok){G.current||e("ok","SYS",`ESP connected — ${m} (${Ve}ms)`),b(!0),f(!0,Ve),T(new Date().toLocaleTimeString()),oe.wifi&&D(oe.wifi);const ge=(oe.servos??[]).reduce((P,w)=>P+(w.currentmA??0),0);U(P=>{const w={...P};for(const j of oe.servos??[]){const Q=P[j.id]||{history:{current:[],load:[]}};w[j.id]={...j,history:{current:j.currentmA!=null?Jm(Q.history.current,j.currentmA):Q.history.current,load:j.loadAbs!=null?Jm(Q.history.load,j.loadAbs):Q.history.load}}}return w});const we=VC(Object.fromEntries((oe.servos??[]).map(P=>[P.id,P])),ge).filter(P=>!I.current.has(P.id));z(we);const Ce=(oe.servos??[]).filter(P=>P.connected).length;h(Ce);const Pe=(oe.servos??[]).filter(P=>P.connected&&P.voltageV!=null);if(Pe.length>0){const P=Pe.reduce((w,j)=>w+j.voltageV,0)/Pe.length;p(P)}Ce>0&&g(ge);const et=(oe.servos??[]).filter(P=>P.connected&&P.currentmA!=null&&P.currentmA>700).map(P=>{const w=UC[P.id]??{type:"twist",num:P.id};return{id:P.id,label:P.label??`J${P.id}`,type:w.type,typeNum:w.num,currentmA:P.currentmA}});if(x(et),Math.random()<.063){const P=(oe.servos??[]).reduce((w,j)=>j.tempC>w?j.tempC:w,0);e("info","POLL",`${Ce}/6 online · ${Ve}ms · ${(ge/1e3).toFixed(2)}A · ${P}°C`)}}}catch(xe){G.current&&e("error","SYS",`ESP lost — ${xe.message}`),b(!1),f(!1,null),h(0)}finally{Z.current=!1}},[m,e,f]);J.useEffect(()=>(ee(),O.current=setInterval(ee,OC),()=>clearInterval(O.current)),[ee]);const ue=J.useCallback(async(N,xe,oe={},Ve="USER")=>{var Pe,et;if(xe==="pos"&&oe.angle!=null){const P=(Pe=S[N])==null?void 0:Pe.currentAngle;if(P!=null){const w=Math.abs(Number(oe.angle)-P);if(w>=2){const j=Math.max(6,Math.round(40/(1+w/15)));oe={...oe,acc:j}}}}const we=`${((et=Nn.find(P=>P.id===N))==null?void 0:et.label)??N} → ${xe}${oe.angle!==void 0?` ${Number(oe.angle).toFixed(1)}°`:""}`;e("cmd",Ve,we);const Ce=new URLSearchParams({servo:String(N),cmd:xe,...oe});try{const P=Date.now(),w=await fetch(`${X.current}/api/command?${Ce}`,{signal:AbortSignal.timeout(5e3)});if(!w.ok)throw new Error(w.statusText);e("ok","ESP",`${we} ✓ (${Date.now()-P}ms)`)}catch(P){e("error","ERR",`${we} — ${P.message}`)}},[e,S]),be=J.useCallback(async()=>{e("error","SYS","⚡ EMERGENCY STOP ALL — killing torque on all servos");try{await fetch(`${X.current}/api/command?servo=all&cmd=estop`,{signal:AbortSignal.timeout(5e3)}),e("ok","ESP","E-STOP acknowledged")}catch(N){e("error","ERR",`E-STOP failed — ${N.message}`)}},[e]),K=()=>{const N=v.trim(),xe=N.startsWith("http")?N:`http://${N}`;u(xe),d(xe),e("info","SYS",`Connecting to ${xe}`)};J.useEffect(()=>{if(!r)return;const N=r;s();const xe=Object.entries(N).sort(([ge],[we])=>Number(ge)-Number(we)).map(([ge,we])=>`J${ge}→${Number(we).toFixed(1)}°`).join(" ");if(e("queued","SIM",`Received from Page 1: ${xe}`),!G.current){e("offline","OFF",`Cannot relay — ESP offline (${X.current})`),c(xe);return}const oe=new URLSearchParams({speed:"5",acc:"20"});Object.entries(N).forEach(([ge,we])=>oe.append(ge,Number(we).toFixed(2))),e("cmd","ESP",`Sending batch → /api/batch?${oe.toString().slice(0,60)}…`);const Ve=Date.now();fetch(`${X.current}/api/batch?${oe}`,{signal:AbortSignal.timeout(5e3)}).then(async ge=>{if(!ge.ok)throw new Error(ge.statusText);const we=await ge.json(),Ce=Date.now()-Ve;e("ok","ESP",`Batch OK — ${we.sent??"?"} servos updated (${Ce}ms)`),a(xe),o(N)}).catch(ge=>{e("error","ERR",`Batch failed — ${ge.message}`),l(`${xe} — ${ge.message}`)})},[r]);const ne=J.useCallback(N=>{e("ok","USER",`Applying preset — ${N.length} servos`);for(const xe of N)ue(xe.id,"pos",{angle:xe.angle,speed:5,acc:20},"USER")},[ue,e]),he=J.useCallback(N=>{I.current.add(N),z(xe=>xe.filter(oe=>oe.id!==N))},[]),ae=J.useMemo(()=>zC(S),[S]),He=J.useMemo(()=>BC(S),[S]),Ne=J.useMemo(()=>HC(S),[S]);return y.jsx("div",{className:"sc-page",children:y.jsxs("div",{className:"sc-wrap",children:[y.jsxs("div",{className:"sc-topbar",children:[y.jsxs("div",{className:"sc-brand",children:[y.jsx("p",{className:"sc-brand-title",children:"TETROBOT Servo Controller"}),y.jsx("p",{className:"sc-brand-sub",children:"6 × ST3215 Smart Servo · Real-time telemetry"})]}),y.jsx("div",{className:"sc-topbar-space"}),y.jsxs("div",{className:"sc-url-row",children:[y.jsx("input",{className:"sc-url-input",value:v,onChange:N=>_(N.target.value),onKeyDown:N=>N.key==="Enter"&&K(),placeholder:"http://nischaylap.local"}),y.jsx("button",{className:"sc-btn",onClick:K,children:"Connect"})]}),y.jsx("div",{className:"sc-topbar-sep"}),y.jsxs("div",{className:"sc-pill",children:[y.jsx("span",{className:`sc-dot ${M?"ok":"bad"}`}),M?"Live":"Disconnected"]}),y.jsxs("div",{className:"sc-pill",children:[y.jsx("span",{className:`sc-dot ${Ne===6?"ok":Ne>0?"warn":"bad"}`}),Ne," / 6"]}),C!=null&&y.jsxs("div",{className:"sc-pill",children:[C," ms"]}),y.jsx("button",{className:"sc-estop",onClick:be,children:"⚡ E-STOP ALL"})]}),y.jsx(jC,{alerts:V,onDismiss:he}),y.jsxs("div",{className:"sc-livestrip",children:[y.jsx("span",{className:"sc-ls-label",children:"SERVOS"}),Nn.map(N=>{const xe=S[N.id],oe=(xe==null?void 0:xe.connected)??!1,Ve=(xe==null?void 0:xe.currentAngle)!=null&&oe?Math.round(xe.currentAngle)+"°":"—",ge=(xe==null?void 0:xe.currentmA)!=null&&oe?Math.round(xe.currentmA)+"mA":"";return y.jsxs("div",{className:"sc-ls-servo",children:[y.jsx("span",{className:"sc-ls-dot",style:{background:oe?N.color:"#888",boxShadow:oe?`0 0 7px ${N.color}`:"none"}}),y.jsx("span",{className:"sc-ls-id",style:{color:N.color},children:N.label}),y.jsx("span",{className:"sc-ls-ang",children:Ve}),ge&&y.jsx("span",{className:"sc-ls-ma",children:ge})]},N.id)}),y.jsx("div",{className:"sc-ls-sep"}),y.jsxs("div",{className:"sc-ls-stat",children:[y.jsx("span",{className:"sc-ls-k",children:"DRAW"}),y.jsxs("span",{className:"sc-ls-v",style:{color:ae>a_?"#cc2200":"#0077dd"},children:[ae.toFixed(1)," ",y.jsx("span",{className:"sc-ls-unit",children:"mA"})]})]}),y.jsxs("div",{className:"sc-ls-stat",children:[y.jsx("span",{className:"sc-ls-k",children:"HOT"}),y.jsx("span",{className:"sc-ls-v",children:He})]}),k&&y.jsxs(y.Fragment,{children:[y.jsx("div",{className:"sc-ls-sep"}),y.jsxs("div",{className:"sc-ls-stat",children:[y.jsx("span",{className:"sc-ls-k",children:"ESP32"}),y.jsxs("span",{className:"sc-ls-v",children:[k.ip," · ",k.hostname,".local"]})]}),y.jsxs("div",{className:"sc-ls-stat",children:[y.jsx("span",{className:"sc-ls-k",children:"SSID"}),y.jsx("span",{className:"sc-ls-v",children:k.ssid})]})]}),y.jsx("div",{className:"sc-ls-sep"}),y.jsxs("div",{className:"sc-ls-stat",children:[y.jsx("span",{className:"sc-ls-k",children:"UPDATED"}),y.jsx("span",{className:"sc-ls-v",children:L})]})]}),y.jsx(XC,{onCmd:ue,onEstop:be}),y.jsx("div",{className:"sc-grid",children:Nn.map(N=>y.jsx(WC,{def:N,data:S[N.id],onCmd:ue},N.id))}),y.jsx($C,{servos:S,onCmd:ue}),y.jsx(YC,{servos:S,onApply:ne}),y.jsx(ZC,{log:i,onClear:n})]})})}const tg=50;function JC(t){return Math.max(0,Math.min(360,180+t*180/Math.PI))}const eR={queued:"#8b5cf6",sent:"#059669",error:"#dc2626",offline:"#d97706"},tR={SIM:"#f59e0b",ESP:"#22c55e",ERR:"#ef4444",OFF:"#f97316"};function nR(){const t=Qe(g=>g.queueAngles),e=Qe(g=>g.simLog),n=Qe(g=>g.connected),i=Qe(g=>g.latencyMs),r=Qe(g=>g.stats),s=Qe(g=>g.clearSimLog),o=Qe(g=>g.resetStats),a=Qe(g=>g.espUrl),l=J.useRef([0,0,0,0,0,0]),c=J.useRef("R1"),f=J.useRef(null);J.useEffect(()=>pn.subscribe(x=>{l.current=x.jointAngles,c.current=x.activeRootId}),[]);const d=new Set([2]);J.useEffect(()=>{const g=setInterval(()=>{const x=Xi.indexOf(c.current),m=v=>x>v?-1:1,u={};l.current.forEach((v,_)=>{const M=_+1;let b=JC(v*m(_));d.has(M)&&(b=360-b),u[M]=b}),t(u)},tg);return()=>clearInterval(g)},[t]),J.useEffect(()=>{const g=f.current;g&&(g.scrollTop=g.scrollHeight)},[e]);const h=e.slice(-40),p=(()=>{try{return new URL(a).hostname}catch{return a}})();return y.jsxs("div",{className:"stp-panel",children:[y.jsxs("div",{className:"stp-header",children:[y.jsxs("div",{className:"stp-header-left",children:[y.jsx("span",{className:"stp-title",children:"SIM → ESP"}),y.jsx("span",{className:`stp-dot ${n?"stp-dot-ok":"stp-dot-off"}`}),y.jsx("span",{className:"stp-conn-label",style:{color:n?"#22c55e":"#f97316"},children:n?"LIVE":"OFFLINE"})]}),y.jsxs("div",{className:"stp-header-right",children:[i!=null&&y.jsxs("span",{className:"stp-lat",children:[i," ms"]}),y.jsx("button",{className:"stp-btn",onClick:s,title:"Clear log",children:"CLR"}),y.jsx("button",{className:"stp-btn stp-btn-reset",onClick:o,title:"Reset counters",children:"RST"})]})]}),y.jsxs("div",{className:"stp-target",children:[y.jsx("span",{className:"stp-target-label",children:"TARGET"}),y.jsx("span",{className:"stp-target-url",children:p}),y.jsxs("span",{className:"stp-target-interval",children:["@",tg,"ms"]})]}),y.jsxs("div",{className:"stp-stats",children:[y.jsxs("div",{className:"stp-stat",children:[y.jsx("span",{className:"stp-stat-k",children:"QUEUED"}),y.jsx("span",{className:"stp-stat-v",style:{color:"#8b5cf6"},children:r.queued})]}),y.jsxs("div",{className:"stp-stat",children:[y.jsx("span",{className:"stp-stat-k",children:"SENT OK"}),y.jsx("span",{className:"stp-stat-v",style:{color:"#22c55e"},children:r.sent})]}),y.jsxs("div",{className:"stp-stat",children:[y.jsx("span",{className:"stp-stat-k",children:"FAILED"}),y.jsx("span",{className:"stp-stat-v",style:{color:"#ef4444"},children:r.failed})]}),y.jsxs("div",{className:"stp-stat",children:[y.jsx("span",{className:"stp-stat-k",children:"DROP%"}),y.jsx("span",{className:"stp-stat-v",style:{color:"#94a3b8"},children:r.queued>0?(r.failed/r.queued*100).toFixed(0):"0"})]})]}),y.jsxs("div",{className:"stp-log-hdr",children:[y.jsx("span",{children:"TRANSMISSION LOG"}),y.jsxs("span",{className:"stp-log-count",children:[e.length," entries"]})]}),y.jsxs("div",{className:"stp-log-body",ref:f,children:[h.length===0&&y.jsx("div",{className:"stp-empty",children:"drag a joint to start transmitting"}),h.map(g=>y.jsxs("div",{className:"stp-entry",children:[y.jsx("span",{className:"stp-e-time",children:g.time.slice(3)}),y.jsx("span",{className:"stp-e-src",style:{color:tR[g.src]??"#94a3b8"},children:g.src}),y.jsx("span",{className:"stp-e-msg",style:{color:eR[g.level]??"#cbd5e1"},children:g.msg})]},g.id))]})]})}function iR(){const t=pn(i=>i.collision),n=pn(i=>i.joints).some(i=>i.limitHit);return!t&&!n?null:y.jsxs("div",{className:"workspace-notification",children:[t&&y.jsxs("div",{className:"workspace-notif-row workspace-notif--collision",children:[y.jsx("span",{className:"workspace-notif-dot"}),"COLLISION — movement blocked"]}),n&&!t&&y.jsxs("div",{className:"workspace-notif-row workspace-notif--limit",children:[y.jsx("span",{className:"workspace-notif-dot"}),"JOINT LIMIT reached"]})]})}function rR({pct:t,color:e,width:n=28,height:i=13}){const s=n-2.5,o=1.8,a=Math.max(0,(s-o*2)*t/100),l=(i-i*.45)/2;return y.jsxs("svg",{width:n,height:i,viewBox:`0 0 ${n} ${i}`,style:{flexShrink:0},children:[y.jsx("rect",{x:.75,y:.75,width:s-1.5,height:i-1.5,rx:2,fill:"none",stroke:e,strokeWidth:1.5}),y.jsx("rect",{x:s,y:l,width:2.5,height:i*.45,rx:1,fill:e}),a>0&&y.jsx("rect",{x:o,y:o,width:a,height:i-o*2,rx:1,fill:e})]})}function sR(){const t=Qe(r=>r.servoOnlineCount),e=Qe(r=>r.avgVoltage);if(t===0||e==null)return null;const n=Math.max(0,Math.min(100,(e-10.8)/(12.6-10.8)*100)),i=n<10?"#ef4444":n<30?"#f97316":"#22c55e";return y.jsxs("div",{className:"app-status-chip",title:`Battery: ${e.toFixed(2)} V avg · ${n.toFixed(0)}%`,children:[y.jsx(rR,{pct:n,color:i}),y.jsxs("span",{style:{fontSize:13,fontWeight:700,color:i,transition:"color 0.4s",letterSpacing:"0.03em"},children:[n.toFixed(0),"%"]}),y.jsxs("span",{style:{fontSize:12,fontWeight:600,color:"var(--text)",marginLeft:1},children:[e.toFixed(1),"V"]})]})}function oR(){const t=Qe(o=>o.servoOnlineCount),e=Qe(o=>o.totalCurrentMA);if(t===0||e==null)return null;const n=250*t,i=450*t,r=e>i?"#ef4444":e>n?"#f97316":"#22c55e",s=e>=1e3?`${(e/1e3).toFixed(2)} A`:`${Math.round(e)} mA`;return y.jsxs("div",{className:"app-status-chip",title:`Total current draw: ${e.toFixed(0)} mA · orange>${n}mA · red>${i}mA`,children:[y.jsx("svg",{width:"11",height:"17",viewBox:"0 0 11 17",fill:"none",style:{flexShrink:0},children:y.jsx("path",{d:"M6.5 1L1 9.5H5.5L4.5 16L10 7.5H5.5L6.5 1Z",fill:r})}),y.jsx("span",{style:{fontSize:13,fontWeight:700,color:r,transition:"color 0.4s",letterSpacing:"0.03em"},children:s})]})}function aR(){const t=Qe(n=>n.overcurrentServos);if(!t||t.length===0)return null;const e=t.map(n=>`${n.label} ${n.type?n.type.toUpperCase()+" "+n.typeNum:""} (${Math.round(n.currentmA)}mA)`).join("  ·  ");return y.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",background:"#cc000022",border:"2px solid #cc0000",borderRadius:999,whiteSpace:"nowrap",animation:"oc-pulse 0.75s ease-in-out infinite alternate",boxShadow:"0 0 14px #cc000044"},children:[y.jsxs("svg",{width:"17",height:"17",viewBox:"0 0 13 13",fill:"none",style:{flexShrink:0},children:[y.jsx("path",{d:"M6.5 1L12 11.5H1L6.5 1Z",stroke:"#cc0000",strokeWidth:"2",fill:"#cc000022"}),y.jsx("line",{x1:"6.5",y1:"4.5",x2:"6.5",y2:"8.5",stroke:"#cc0000",strokeWidth:"1.8",strokeLinecap:"round"}),y.jsx("circle",{cx:"6.5",cy:"10.2",r:"0.9",fill:"#cc0000"})]}),y.jsx("span",{style:{fontSize:14,fontWeight:900,color:"#cc0000",letterSpacing:"0.08em",textTransform:"uppercase"},children:"Overcurrent"}),y.jsx("span",{style:{fontSize:14,fontWeight:800,color:"#cc0000",letterSpacing:"0.03em"},children:e})]})}function lR({page:t,setPage:e}){const n=Qe(o=>o.connected),i=Qe(o=>o.servoOnlineCount);let r,s;return n?i===0?(r="#f59e0b",s="No servos"):i<6?(r="#f59e0b",s=`${i}/6 live`):(r="#22c55e",s="All OK"):(r="#ef4444",s="Offline"),y.jsxs("header",{className:"app-header",children:[y.jsxs("div",{className:"app-header-brand",children:[y.jsx("span",{className:"app-logo",children:"TETROBOT"}),y.jsx("span",{className:"app-logo-sub",children:"modular arms"}),y.jsx("span",{className:"app-logo-byline",children:"by nischay sai"})]}),y.jsx("div",{className:"app-header-sep"}),y.jsxs("nav",{className:"app-nav",children:[y.jsxs("button",{className:`app-nav-tab ${t==="sim"?"active":""}`,onClick:()=>e("sim"),children:[y.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[y.jsx("path",{d:"M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),y.jsx("circle",{cx:"7",cy:"7",r:"1.5",fill:"currentColor"})]}),"Simulator"]}),y.jsxs("button",{className:`app-nav-tab ${t==="servo"?"active":""}`,onClick:()=>e("servo"),children:[y.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[y.jsx("circle",{cx:"7",cy:"7",r:"3",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),y.jsx("circle",{cx:"7",cy:"7",r:"1",fill:"currentColor"}),y.jsx("path",{d:"M7 1V3M7 11V13M1 7H3M11 7H13M2.5 2.5L4 4M10 10L11.5 11.5M11.5 2.5L10 4M4 10L2.5 11.5",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"})]}),"Servo Control"]})]}),y.jsx("div",{className:"app-header-space"}),y.jsxs("div",{className:"app-header-right",children:[y.jsx(aR,{}),y.jsx(sR,{}),y.jsx(oR,{}),y.jsxs("div",{className:"app-status-chip",title:`ESP32-C3: ${s}`,children:[y.jsx("span",{style:{width:10,height:10,borderRadius:"50%",display:"inline-block",flexShrink:0,background:r,boxShadow:`0 0 7px ${r}`,transition:"background 0.4s, box-shadow 0.4s"}}),y.jsx("span",{children:"ESP32-C3"}),y.jsxs("span",{style:{fontSize:12,color:r,marginLeft:2,fontWeight:700,transition:"color 0.4s"},children:["· ",s]})]}),y.jsx("div",{className:"app-status-chip app-status-chip-mono",children:"6 × ST3215"})]})]})}function cR({page:t}){return y.jsxs("footer",{className:"app-footer",children:[y.jsx("span",{className:"app-footer-brand",children:"ROBO4"}),y.jsx("span",{className:"app-footer-sep"}),y.jsx("span",{children:"Modular Arm Platform"}),y.jsx("span",{className:"app-footer-sep"}),y.jsx("span",{children:"6 × ST3215 · ESP32-C3"}),y.jsx("div",{className:"app-footer-space"}),y.jsx("span",{className:`app-footer-page-pill ${t==="sim"?"active":""}`,style:{cursor:"pointer"},children:"◈ Simulator"}),y.jsx("span",{className:`app-footer-page-pill ${t==="servo"?"active":""}`,style:{cursor:"pointer"},children:"⚙ Servo Control"})]})}function uR(){const[t,e]=J.useState("sim");return y.jsxs("div",{className:"app-shell",children:[y.jsx(lR,{page:t,setPage:e}),y.jsxs("main",{className:"app-main",children:[y.jsxs("div",{className:"app-root",style:t!=="sim"?{visibility:"hidden",pointerEvents:"none",position:"absolute",inset:0}:{},children:[y.jsx(_S,{}),y.jsxs("div",{className:"canvas-wrapper",children:[y.jsx(AC,{}),y.jsx(iR,{}),y.jsxs("div",{className:"top-right-cluster",children:[y.jsx(LC,{}),y.jsx(NC,{})]}),y.jsx(nR,{}),y.jsx(CC,{})]})]}),y.jsx("div",{className:"app-servo-wrap",style:t!=="servo"?{display:"none"}:{},children:y.jsx(QC,{})})]}),y.jsx(cR,{page:t})]})}mv(document.getElementById("root")).render(y.jsx(J.StrictMode,{children:y.jsx(uR,{})}));

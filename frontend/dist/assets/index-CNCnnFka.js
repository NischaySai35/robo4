(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();function Ug(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var Fg={exports:{}},uc={},Og={exports:{}},Ke={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ma=Symbol.for("react.element"),rx=Symbol.for("react.portal"),sx=Symbol.for("react.fragment"),ox=Symbol.for("react.strict_mode"),ax=Symbol.for("react.profiler"),lx=Symbol.for("react.provider"),cx=Symbol.for("react.context"),ux=Symbol.for("react.forward_ref"),dx=Symbol.for("react.suspense"),fx=Symbol.for("react.memo"),hx=Symbol.for("react.lazy"),Mh=Symbol.iterator;function px(n){return n===null||typeof n!="object"?null:(n=Mh&&n[Mh]||n["@@iterator"],typeof n=="function"?n:null)}var kg={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},zg=Object.assign,Bg={};function to(n,e,t){this.props=n,this.context=e,this.refs=Bg,this.updater=t||kg}to.prototype.isReactComponent={};to.prototype.setState=function(n,e){if(typeof n!="object"&&typeof n!="function"&&n!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,n,e,"setState")};to.prototype.forceUpdate=function(n){this.updater.enqueueForceUpdate(this,n,"forceUpdate")};function Hg(){}Hg.prototype=to.prototype;function rf(n,e,t){this.props=n,this.context=e,this.refs=Bg,this.updater=t||kg}var sf=rf.prototype=new Hg;sf.constructor=rf;zg(sf,to.prototype);sf.isPureReactComponent=!0;var Sh=Array.isArray,Vg=Object.prototype.hasOwnProperty,of={current:null},jg={key:!0,ref:!0,__self:!0,__source:!0};function Gg(n,e,t){var i,r={},s=null,o=null;if(e!=null)for(i in e.ref!==void 0&&(o=e.ref),e.key!==void 0&&(s=""+e.key),e)Vg.call(e,i)&&!jg.hasOwnProperty(i)&&(r[i]=e[i]);var a=arguments.length-2;if(a===1)r.children=t;else if(1<a){for(var l=Array(a),c=0;c<a;c++)l[c]=arguments[c+2];r.children=l}if(n&&n.defaultProps)for(i in a=n.defaultProps,a)r[i]===void 0&&(r[i]=a[i]);return{$$typeof:ma,type:n,key:s,ref:o,props:r,_owner:of.current}}function mx(n,e){return{$$typeof:ma,type:n.type,key:e,ref:n.ref,props:n.props,_owner:n._owner}}function af(n){return typeof n=="object"&&n!==null&&n.$$typeof===ma}function gx(n){var e={"=":"=0",":":"=2"};return"$"+n.replace(/[=:]/g,function(t){return e[t]})}var Eh=/\/+/g;function Fc(n,e){return typeof n=="object"&&n!==null&&n.key!=null?gx(""+n.key):e.toString(36)}function fl(n,e,t,i,r){var s=typeof n;(s==="undefined"||s==="boolean")&&(n=null);var o=!1;if(n===null)o=!0;else switch(s){case"string":case"number":o=!0;break;case"object":switch(n.$$typeof){case ma:case rx:o=!0}}if(o)return o=n,r=r(o),n=i===""?"."+Fc(o,0):i,Sh(r)?(t="",n!=null&&(t=n.replace(Eh,"$&/")+"/"),fl(r,e,t,"",function(c){return c})):r!=null&&(af(r)&&(r=mx(r,t+(!r.key||o&&o.key===r.key?"":(""+r.key).replace(Eh,"$&/")+"/")+n)),e.push(r)),1;if(o=0,i=i===""?".":i+":",Sh(n))for(var a=0;a<n.length;a++){s=n[a];var l=i+Fc(s,a);o+=fl(s,e,t,l,r)}else if(l=px(n),typeof l=="function")for(n=l.call(n),a=0;!(s=n.next()).done;)s=s.value,l=i+Fc(s,a++),o+=fl(s,e,t,l,r);else if(s==="object")throw e=String(n),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(n).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return o}function Ea(n,e,t){if(n==null)return n;var i=[],r=0;return fl(n,i,"","",function(s){return e.call(t,s,r++)}),i}function vx(n){if(n._status===-1){var e=n._result;e=e(),e.then(function(t){(n._status===0||n._status===-1)&&(n._status=1,n._result=t)},function(t){(n._status===0||n._status===-1)&&(n._status=2,n._result=t)}),n._status===-1&&(n._status=0,n._result=e)}if(n._status===1)return n._result.default;throw n._result}var on={current:null},hl={transition:null},_x={ReactCurrentDispatcher:on,ReactCurrentBatchConfig:hl,ReactCurrentOwner:of};function Wg(){throw Error("act(...) is not supported in production builds of React.")}Ke.Children={map:Ea,forEach:function(n,e,t){Ea(n,function(){e.apply(this,arguments)},t)},count:function(n){var e=0;return Ea(n,function(){e++}),e},toArray:function(n){return Ea(n,function(e){return e})||[]},only:function(n){if(!af(n))throw Error("React.Children.only expected to receive a single React element child.");return n}};Ke.Component=to;Ke.Fragment=sx;Ke.Profiler=ax;Ke.PureComponent=rf;Ke.StrictMode=ox;Ke.Suspense=dx;Ke.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=_x;Ke.act=Wg;Ke.cloneElement=function(n,e,t){if(n==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+n+".");var i=zg({},n.props),r=n.key,s=n.ref,o=n._owner;if(e!=null){if(e.ref!==void 0&&(s=e.ref,o=of.current),e.key!==void 0&&(r=""+e.key),n.type&&n.type.defaultProps)var a=n.type.defaultProps;for(l in e)Vg.call(e,l)&&!jg.hasOwnProperty(l)&&(i[l]=e[l]===void 0&&a!==void 0?a[l]:e[l])}var l=arguments.length-2;if(l===1)i.children=t;else if(1<l){a=Array(l);for(var c=0;c<l;c++)a[c]=arguments[c+2];i.children=a}return{$$typeof:ma,type:n.type,key:r,ref:s,props:i,_owner:o}};Ke.createContext=function(n){return n={$$typeof:cx,_currentValue:n,_currentValue2:n,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},n.Provider={$$typeof:lx,_context:n},n.Consumer=n};Ke.createElement=Gg;Ke.createFactory=function(n){var e=Gg.bind(null,n);return e.type=n,e};Ke.createRef=function(){return{current:null}};Ke.forwardRef=function(n){return{$$typeof:ux,render:n}};Ke.isValidElement=af;Ke.lazy=function(n){return{$$typeof:hx,_payload:{_status:-1,_result:n},_init:vx}};Ke.memo=function(n,e){return{$$typeof:fx,type:n,compare:e===void 0?null:e}};Ke.startTransition=function(n){var e=hl.transition;hl.transition={};try{n()}finally{hl.transition=e}};Ke.unstable_act=Wg;Ke.useCallback=function(n,e){return on.current.useCallback(n,e)};Ke.useContext=function(n){return on.current.useContext(n)};Ke.useDebugValue=function(){};Ke.useDeferredValue=function(n){return on.current.useDeferredValue(n)};Ke.useEffect=function(n,e){return on.current.useEffect(n,e)};Ke.useId=function(){return on.current.useId()};Ke.useImperativeHandle=function(n,e,t){return on.current.useImperativeHandle(n,e,t)};Ke.useInsertionEffect=function(n,e){return on.current.useInsertionEffect(n,e)};Ke.useLayoutEffect=function(n,e){return on.current.useLayoutEffect(n,e)};Ke.useMemo=function(n,e){return on.current.useMemo(n,e)};Ke.useReducer=function(n,e,t){return on.current.useReducer(n,e,t)};Ke.useRef=function(n){return on.current.useRef(n)};Ke.useState=function(n){return on.current.useState(n)};Ke.useSyncExternalStore=function(n,e,t){return on.current.useSyncExternalStore(n,e,t)};Ke.useTransition=function(){return on.current.useTransition()};Ke.version="18.3.1";Og.exports=Ke;var te=Og.exports;const xx=Ug(te);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var yx=te,Mx=Symbol.for("react.element"),Sx=Symbol.for("react.fragment"),Ex=Object.prototype.hasOwnProperty,wx=yx.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Tx={key:!0,ref:!0,__self:!0,__source:!0};function Xg(n,e,t){var i,r={},s=null,o=null;t!==void 0&&(s=""+t),e.key!==void 0&&(s=""+e.key),e.ref!==void 0&&(o=e.ref);for(i in e)Ex.call(e,i)&&!Tx.hasOwnProperty(i)&&(r[i]=e[i]);if(n&&n.defaultProps)for(i in e=n.defaultProps,e)r[i]===void 0&&(r[i]=e[i]);return{$$typeof:Mx,type:n,key:s,ref:o,props:r,_owner:wx.current}}uc.Fragment=Sx;uc.jsx=Xg;uc.jsxs=Xg;Fg.exports=uc;var x=Fg.exports,$g={exports:{}},An={},Yg={exports:{}},qg={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(n){function e(F,H){var W=F.length;F.push(H);e:for(;0<W;){var z=W-1>>>1,re=F[z];if(0<r(re,H))F[z]=H,F[W]=re,W=z;else break e}}function t(F){return F.length===0?null:F[0]}function i(F){if(F.length===0)return null;var H=F[0],W=F.pop();if(W!==H){F[0]=W;e:for(var z=0,re=F.length,K=re>>>1;z<K;){var k=2*(z+1)-1,I=F[k],ne=k+1,ee=F[ne];if(0>r(I,W))ne<re&&0>r(ee,I)?(F[z]=ee,F[ne]=W,z=ne):(F[z]=I,F[k]=W,z=k);else if(ne<re&&0>r(ee,W))F[z]=ee,F[ne]=W,z=ne;else break e}}return H}function r(F,H){var W=F.sortIndex-H.sortIndex;return W!==0?W:F.id-H.id}if(typeof performance=="object"&&typeof performance.now=="function"){var s=performance;n.unstable_now=function(){return s.now()}}else{var o=Date,a=o.now();n.unstable_now=function(){return o.now()-a}}var l=[],c=[],u=1,h=null,p=3,f=!1,g=!1,y=!1,m=typeof setTimeout=="function"?setTimeout:null,d=typeof clearTimeout=="function"?clearTimeout:null,v=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function _(F){for(var H=t(c);H!==null;){if(H.callback===null)i(c);else if(H.startTime<=F)i(c),H.sortIndex=H.expirationTime,e(l,H);else break;H=t(c)}}function M(F){if(y=!1,_(F),!g)if(t(l)!==null)g=!0,Q(T);else{var H=t(c);H!==null&&$(M,H.startTime-F)}}function T(F,H){g=!1,y&&(y=!1,d(P),P=-1),f=!0;var W=p;try{for(_(H),h=t(l);h!==null&&(!(h.expirationTime>H)||F&&!D());){var z=h.callback;if(typeof z=="function"){h.callback=null,p=h.priorityLevel;var re=z(h.expirationTime<=H);H=n.unstable_now(),typeof re=="function"?h.callback=re:h===t(l)&&i(l),_(H)}else i(l);h=t(l)}if(h!==null)var K=!0;else{var k=t(c);k!==null&&$(M,k.startTime-H),K=!1}return K}finally{h=null,p=W,f=!1}}var b=!1,E=null,P=-1,A=5,S=-1;function D(){return!(n.unstable_now()-S<A)}function B(){if(E!==null){var F=n.unstable_now();S=F;var H=!0;try{H=E(!0,F)}finally{H?L():(b=!1,E=null)}}else b=!1}var L;if(typeof v=="function")L=function(){v(B)};else if(typeof MessageChannel<"u"){var V=new MessageChannel,j=V.port2;V.port1.onmessage=B,L=function(){j.postMessage(null)}}else L=function(){m(B,0)};function Q(F){E=F,b||(b=!0,L())}function $(F,H){P=m(function(){F(n.unstable_now())},H)}n.unstable_IdlePriority=5,n.unstable_ImmediatePriority=1,n.unstable_LowPriority=4,n.unstable_NormalPriority=3,n.unstable_Profiling=null,n.unstable_UserBlockingPriority=2,n.unstable_cancelCallback=function(F){F.callback=null},n.unstable_continueExecution=function(){g||f||(g=!0,Q(T))},n.unstable_forceFrameRate=function(F){0>F||125<F?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):A=0<F?Math.floor(1e3/F):5},n.unstable_getCurrentPriorityLevel=function(){return p},n.unstable_getFirstCallbackNode=function(){return t(l)},n.unstable_next=function(F){switch(p){case 1:case 2:case 3:var H=3;break;default:H=p}var W=p;p=H;try{return F()}finally{p=W}},n.unstable_pauseExecution=function(){},n.unstable_requestPaint=function(){},n.unstable_runWithPriority=function(F,H){switch(F){case 1:case 2:case 3:case 4:case 5:break;default:F=3}var W=p;p=F;try{return H()}finally{p=W}},n.unstable_scheduleCallback=function(F,H,W){var z=n.unstable_now();switch(typeof W=="object"&&W!==null?(W=W.delay,W=typeof W=="number"&&0<W?z+W:z):W=z,F){case 1:var re=-1;break;case 2:re=250;break;case 5:re=1073741823;break;case 4:re=1e4;break;default:re=5e3}return re=W+re,F={id:u++,callback:H,priorityLevel:F,startTime:W,expirationTime:re,sortIndex:-1},W>z?(F.sortIndex=W,e(c,F),t(l)===null&&F===t(c)&&(y?(d(P),P=-1):y=!0,$(M,W-z))):(F.sortIndex=re,e(l,F),g||f||(g=!0,Q(T))),F},n.unstable_shouldYield=D,n.unstable_wrapCallback=function(F){var H=p;return function(){var W=p;p=H;try{return F.apply(this,arguments)}finally{p=W}}}})(qg);Yg.exports=qg;var Ax=Yg.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var bx=te,Tn=Ax;function ue(n){for(var e="https://reactjs.org/docs/error-decoder.html?invariant="+n,t=1;t<arguments.length;t++)e+="&args[]="+encodeURIComponent(arguments[t]);return"Minified React error #"+n+"; visit "+e+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Kg=new Set,Yo={};function Wr(n,e){Hs(n,e),Hs(n+"Capture",e)}function Hs(n,e){for(Yo[n]=e,n=0;n<e.length;n++)Kg.add(e[n])}var Ri=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),nd=Object.prototype.hasOwnProperty,Cx=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,wh={},Th={};function Rx(n){return nd.call(Th,n)?!0:nd.call(wh,n)?!1:Cx.test(n)?Th[n]=!0:(wh[n]=!0,!1)}function Px(n,e,t,i){if(t!==null&&t.type===0)return!1;switch(typeof e){case"function":case"symbol":return!0;case"boolean":return i?!1:t!==null?!t.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function Nx(n,e,t,i){if(e===null||typeof e>"u"||Px(n,e,t,i))return!0;if(i)return!1;if(t!==null)switch(t.type){case 3:return!e;case 4:return e===!1;case 5:return isNaN(e);case 6:return isNaN(e)||1>e}return!1}function an(n,e,t,i,r,s,o){this.acceptsBooleans=e===2||e===3||e===4,this.attributeName=i,this.attributeNamespace=r,this.mustUseProperty=t,this.propertyName=n,this.type=e,this.sanitizeURL=s,this.removeEmptyString=o}var Gt={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){Gt[n]=new an(n,0,!1,n,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var e=n[0];Gt[e]=new an(e,1,!1,n[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(n){Gt[n]=new an(n,2,!1,n.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){Gt[n]=new an(n,2,!1,n,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){Gt[n]=new an(n,3,!1,n.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(n){Gt[n]=new an(n,3,!0,n,null,!1,!1)});["capture","download"].forEach(function(n){Gt[n]=new an(n,4,!1,n,null,!1,!1)});["cols","rows","size","span"].forEach(function(n){Gt[n]=new an(n,6,!1,n,null,!1,!1)});["rowSpan","start"].forEach(function(n){Gt[n]=new an(n,5,!1,n.toLowerCase(),null,!1,!1)});var lf=/[\-:]([a-z])/g;function cf(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var e=n.replace(lf,cf);Gt[e]=new an(e,1,!1,n,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var e=n.replace(lf,cf);Gt[e]=new an(e,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(n){var e=n.replace(lf,cf);Gt[e]=new an(e,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(n){Gt[n]=new an(n,1,!1,n.toLowerCase(),null,!1,!1)});Gt.xlinkHref=new an("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(n){Gt[n]=new an(n,1,!1,n.toLowerCase(),null,!0,!0)});function uf(n,e,t,i){var r=Gt.hasOwnProperty(e)?Gt[e]:null;(r!==null?r.type!==0:i||!(2<e.length)||e[0]!=="o"&&e[0]!=="O"||e[1]!=="n"&&e[1]!=="N")&&(Nx(e,t,r,i)&&(t=null),i||r===null?Rx(e)&&(t===null?n.removeAttribute(e):n.setAttribute(e,""+t)):r.mustUseProperty?n[r.propertyName]=t===null?r.type===3?!1:"":t:(e=r.attributeName,i=r.attributeNamespace,t===null?n.removeAttribute(e):(r=r.type,t=r===3||r===4&&t===!0?"":""+t,i?n.setAttributeNS(i,e,t):n.setAttribute(e,t))))}var Ii=bx.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,wa=Symbol.for("react.element"),_s=Symbol.for("react.portal"),xs=Symbol.for("react.fragment"),df=Symbol.for("react.strict_mode"),id=Symbol.for("react.profiler"),Zg=Symbol.for("react.provider"),Jg=Symbol.for("react.context"),ff=Symbol.for("react.forward_ref"),rd=Symbol.for("react.suspense"),sd=Symbol.for("react.suspense_list"),hf=Symbol.for("react.memo"),Wi=Symbol.for("react.lazy"),Qg=Symbol.for("react.offscreen"),Ah=Symbol.iterator;function fo(n){return n===null||typeof n!="object"?null:(n=Ah&&n[Ah]||n["@@iterator"],typeof n=="function"?n:null)}var xt=Object.assign,Oc;function Co(n){if(Oc===void 0)try{throw Error()}catch(t){var e=t.stack.trim().match(/\n( *(at )?)/);Oc=e&&e[1]||""}return`
`+Oc+n}var kc=!1;function zc(n,e){if(!n||kc)return"";kc=!0;var t=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(e)if(e=function(){throw Error()},Object.defineProperty(e.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(e,[])}catch(c){var i=c}Reflect.construct(n,[],e)}else{try{e.call()}catch(c){i=c}n.call(e.prototype)}else{try{throw Error()}catch(c){i=c}n()}}catch(c){if(c&&i&&typeof c.stack=="string"){for(var r=c.stack.split(`
`),s=i.stack.split(`
`),o=r.length-1,a=s.length-1;1<=o&&0<=a&&r[o]!==s[a];)a--;for(;1<=o&&0<=a;o--,a--)if(r[o]!==s[a]){if(o!==1||a!==1)do if(o--,a--,0>a||r[o]!==s[a]){var l=`
`+r[o].replace(" at new "," at ");return n.displayName&&l.includes("<anonymous>")&&(l=l.replace("<anonymous>",n.displayName)),l}while(1<=o&&0<=a);break}}}finally{kc=!1,Error.prepareStackTrace=t}return(n=n?n.displayName||n.name:"")?Co(n):""}function Lx(n){switch(n.tag){case 5:return Co(n.type);case 16:return Co("Lazy");case 13:return Co("Suspense");case 19:return Co("SuspenseList");case 0:case 2:case 15:return n=zc(n.type,!1),n;case 11:return n=zc(n.type.render,!1),n;case 1:return n=zc(n.type,!0),n;default:return""}}function od(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case xs:return"Fragment";case _s:return"Portal";case id:return"Profiler";case df:return"StrictMode";case rd:return"Suspense";case sd:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case Jg:return(n.displayName||"Context")+".Consumer";case Zg:return(n._context.displayName||"Context")+".Provider";case ff:var e=n.render;return n=n.displayName,n||(n=e.displayName||e.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case hf:return e=n.displayName||null,e!==null?e:od(n.type)||"Memo";case Wi:e=n._payload,n=n._init;try{return od(n(e))}catch{}}return null}function Ix(n){var e=n.type;switch(n.tag){case 24:return"Cache";case 9:return(e.displayName||"Context")+".Consumer";case 10:return(e._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=e.render,n=n.displayName||n.name||"",e.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return e;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return od(e);case 8:return e===df?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e}return null}function dr(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function e0(n){var e=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(e==="checkbox"||e==="radio")}function Dx(n){var e=e0(n)?"checked":"value",t=Object.getOwnPropertyDescriptor(n.constructor.prototype,e),i=""+n[e];if(!n.hasOwnProperty(e)&&typeof t<"u"&&typeof t.get=="function"&&typeof t.set=="function"){var r=t.get,s=t.set;return Object.defineProperty(n,e,{configurable:!0,get:function(){return r.call(this)},set:function(o){i=""+o,s.call(this,o)}}),Object.defineProperty(n,e,{enumerable:t.enumerable}),{getValue:function(){return i},setValue:function(o){i=""+o},stopTracking:function(){n._valueTracker=null,delete n[e]}}}}function Ta(n){n._valueTracker||(n._valueTracker=Dx(n))}function t0(n){if(!n)return!1;var e=n._valueTracker;if(!e)return!0;var t=e.getValue(),i="";return n&&(i=e0(n)?n.checked?"true":"false":n.value),n=i,n!==t?(e.setValue(n),!0):!1}function bl(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function ad(n,e){var t=e.checked;return xt({},e,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:t??n._wrapperState.initialChecked})}function bh(n,e){var t=e.defaultValue==null?"":e.defaultValue,i=e.checked!=null?e.checked:e.defaultChecked;t=dr(e.value!=null?e.value:t),n._wrapperState={initialChecked:i,initialValue:t,controlled:e.type==="checkbox"||e.type==="radio"?e.checked!=null:e.value!=null}}function n0(n,e){e=e.checked,e!=null&&uf(n,"checked",e,!1)}function ld(n,e){n0(n,e);var t=dr(e.value),i=e.type;if(t!=null)i==="number"?(t===0&&n.value===""||n.value!=t)&&(n.value=""+t):n.value!==""+t&&(n.value=""+t);else if(i==="submit"||i==="reset"){n.removeAttribute("value");return}e.hasOwnProperty("value")?cd(n,e.type,t):e.hasOwnProperty("defaultValue")&&cd(n,e.type,dr(e.defaultValue)),e.checked==null&&e.defaultChecked!=null&&(n.defaultChecked=!!e.defaultChecked)}function Ch(n,e,t){if(e.hasOwnProperty("value")||e.hasOwnProperty("defaultValue")){var i=e.type;if(!(i!=="submit"&&i!=="reset"||e.value!==void 0&&e.value!==null))return;e=""+n._wrapperState.initialValue,t||e===n.value||(n.value=e),n.defaultValue=e}t=n.name,t!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,t!==""&&(n.name=t)}function cd(n,e,t){(e!=="number"||bl(n.ownerDocument)!==n)&&(t==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+t&&(n.defaultValue=""+t))}var Ro=Array.isArray;function Ls(n,e,t,i){if(n=n.options,e){e={};for(var r=0;r<t.length;r++)e["$"+t[r]]=!0;for(t=0;t<n.length;t++)r=e.hasOwnProperty("$"+n[t].value),n[t].selected!==r&&(n[t].selected=r),r&&i&&(n[t].defaultSelected=!0)}else{for(t=""+dr(t),e=null,r=0;r<n.length;r++){if(n[r].value===t){n[r].selected=!0,i&&(n[r].defaultSelected=!0);return}e!==null||n[r].disabled||(e=n[r])}e!==null&&(e.selected=!0)}}function ud(n,e){if(e.dangerouslySetInnerHTML!=null)throw Error(ue(91));return xt({},e,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Rh(n,e){var t=e.value;if(t==null){if(t=e.children,e=e.defaultValue,t!=null){if(e!=null)throw Error(ue(92));if(Ro(t)){if(1<t.length)throw Error(ue(93));t=t[0]}e=t}e==null&&(e=""),t=e}n._wrapperState={initialValue:dr(t)}}function i0(n,e){var t=dr(e.value),i=dr(e.defaultValue);t!=null&&(t=""+t,t!==n.value&&(n.value=t),e.defaultValue==null&&n.defaultValue!==t&&(n.defaultValue=t)),i!=null&&(n.defaultValue=""+i)}function Ph(n){var e=n.textContent;e===n._wrapperState.initialValue&&e!==""&&e!==null&&(n.value=e)}function r0(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function dd(n,e){return n==null||n==="http://www.w3.org/1999/xhtml"?r0(e):n==="http://www.w3.org/2000/svg"&&e==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var Aa,s0=function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(e,t,i,r){MSApp.execUnsafeLocalFunction(function(){return n(e,t,i,r)})}:n}(function(n,e){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=e;else{for(Aa=Aa||document.createElement("div"),Aa.innerHTML="<svg>"+e.valueOf().toString()+"</svg>",e=Aa.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;e.firstChild;)n.appendChild(e.firstChild)}});function qo(n,e){if(e){var t=n.firstChild;if(t&&t===n.lastChild&&t.nodeType===3){t.nodeValue=e;return}}n.textContent=e}var Uo={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ux=["Webkit","ms","Moz","O"];Object.keys(Uo).forEach(function(n){Ux.forEach(function(e){e=e+n.charAt(0).toUpperCase()+n.substring(1),Uo[e]=Uo[n]})});function o0(n,e,t){return e==null||typeof e=="boolean"||e===""?"":t||typeof e!="number"||e===0||Uo.hasOwnProperty(n)&&Uo[n]?(""+e).trim():e+"px"}function a0(n,e){n=n.style;for(var t in e)if(e.hasOwnProperty(t)){var i=t.indexOf("--")===0,r=o0(t,e[t],i);t==="float"&&(t="cssFloat"),i?n.setProperty(t,r):n[t]=r}}var Fx=xt({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function fd(n,e){if(e){if(Fx[n]&&(e.children!=null||e.dangerouslySetInnerHTML!=null))throw Error(ue(137,n));if(e.dangerouslySetInnerHTML!=null){if(e.children!=null)throw Error(ue(60));if(typeof e.dangerouslySetInnerHTML!="object"||!("__html"in e.dangerouslySetInnerHTML))throw Error(ue(61))}if(e.style!=null&&typeof e.style!="object")throw Error(ue(62))}}function hd(n,e){if(n.indexOf("-")===-1)return typeof e.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var pd=null;function pf(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var md=null,Is=null,Ds=null;function Nh(n){if(n=_a(n)){if(typeof md!="function")throw Error(ue(280));var e=n.stateNode;e&&(e=mc(e),md(n.stateNode,n.type,e))}}function l0(n){Is?Ds?Ds.push(n):Ds=[n]:Is=n}function c0(){if(Is){var n=Is,e=Ds;if(Ds=Is=null,Nh(n),e)for(n=0;n<e.length;n++)Nh(e[n])}}function u0(n,e){return n(e)}function d0(){}var Bc=!1;function f0(n,e,t){if(Bc)return n(e,t);Bc=!0;try{return u0(n,e,t)}finally{Bc=!1,(Is!==null||Ds!==null)&&(d0(),c0())}}function Ko(n,e){var t=n.stateNode;if(t===null)return null;var i=mc(t);if(i===null)return null;t=i[e];e:switch(e){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(n=n.type,i=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!i;break e;default:n=!1}if(n)return null;if(t&&typeof t!="function")throw Error(ue(231,e,typeof t));return t}var gd=!1;if(Ri)try{var ho={};Object.defineProperty(ho,"passive",{get:function(){gd=!0}}),window.addEventListener("test",ho,ho),window.removeEventListener("test",ho,ho)}catch{gd=!1}function Ox(n,e,t,i,r,s,o,a,l){var c=Array.prototype.slice.call(arguments,3);try{e.apply(t,c)}catch(u){this.onError(u)}}var Fo=!1,Cl=null,Rl=!1,vd=null,kx={onError:function(n){Fo=!0,Cl=n}};function zx(n,e,t,i,r,s,o,a,l){Fo=!1,Cl=null,Ox.apply(kx,arguments)}function Bx(n,e,t,i,r,s,o,a,l){if(zx.apply(this,arguments),Fo){if(Fo){var c=Cl;Fo=!1,Cl=null}else throw Error(ue(198));Rl||(Rl=!0,vd=c)}}function Xr(n){var e=n,t=n;if(n.alternate)for(;e.return;)e=e.return;else{n=e;do e=n,e.flags&4098&&(t=e.return),n=e.return;while(n)}return e.tag===3?t:null}function h0(n){if(n.tag===13){var e=n.memoizedState;if(e===null&&(n=n.alternate,n!==null&&(e=n.memoizedState)),e!==null)return e.dehydrated}return null}function Lh(n){if(Xr(n)!==n)throw Error(ue(188))}function Hx(n){var e=n.alternate;if(!e){if(e=Xr(n),e===null)throw Error(ue(188));return e!==n?null:n}for(var t=n,i=e;;){var r=t.return;if(r===null)break;var s=r.alternate;if(s===null){if(i=r.return,i!==null){t=i;continue}break}if(r.child===s.child){for(s=r.child;s;){if(s===t)return Lh(r),n;if(s===i)return Lh(r),e;s=s.sibling}throw Error(ue(188))}if(t.return!==i.return)t=r,i=s;else{for(var o=!1,a=r.child;a;){if(a===t){o=!0,t=r,i=s;break}if(a===i){o=!0,i=r,t=s;break}a=a.sibling}if(!o){for(a=s.child;a;){if(a===t){o=!0,t=s,i=r;break}if(a===i){o=!0,i=s,t=r;break}a=a.sibling}if(!o)throw Error(ue(189))}}if(t.alternate!==i)throw Error(ue(190))}if(t.tag!==3)throw Error(ue(188));return t.stateNode.current===t?n:e}function p0(n){return n=Hx(n),n!==null?m0(n):null}function m0(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var e=m0(n);if(e!==null)return e;n=n.sibling}return null}var g0=Tn.unstable_scheduleCallback,Ih=Tn.unstable_cancelCallback,Vx=Tn.unstable_shouldYield,jx=Tn.unstable_requestPaint,St=Tn.unstable_now,Gx=Tn.unstable_getCurrentPriorityLevel,mf=Tn.unstable_ImmediatePriority,v0=Tn.unstable_UserBlockingPriority,Pl=Tn.unstable_NormalPriority,Wx=Tn.unstable_LowPriority,_0=Tn.unstable_IdlePriority,dc=null,ci=null;function Xx(n){if(ci&&typeof ci.onCommitFiberRoot=="function")try{ci.onCommitFiberRoot(dc,n,void 0,(n.current.flags&128)===128)}catch{}}var Qn=Math.clz32?Math.clz32:qx,$x=Math.log,Yx=Math.LN2;function qx(n){return n>>>=0,n===0?32:31-($x(n)/Yx|0)|0}var ba=64,Ca=4194304;function Po(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Nl(n,e){var t=n.pendingLanes;if(t===0)return 0;var i=0,r=n.suspendedLanes,s=n.pingedLanes,o=t&268435455;if(o!==0){var a=o&~r;a!==0?i=Po(a):(s&=o,s!==0&&(i=Po(s)))}else o=t&~r,o!==0?i=Po(o):s!==0&&(i=Po(s));if(i===0)return 0;if(e!==0&&e!==i&&!(e&r)&&(r=i&-i,s=e&-e,r>=s||r===16&&(s&4194240)!==0))return e;if(i&4&&(i|=t&16),e=n.entangledLanes,e!==0)for(n=n.entanglements,e&=i;0<e;)t=31-Qn(e),r=1<<t,i|=n[t],e&=~r;return i}function Kx(n,e){switch(n){case 1:case 2:case 4:return e+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Zx(n,e){for(var t=n.suspendedLanes,i=n.pingedLanes,r=n.expirationTimes,s=n.pendingLanes;0<s;){var o=31-Qn(s),a=1<<o,l=r[o];l===-1?(!(a&t)||a&i)&&(r[o]=Kx(a,e)):l<=e&&(n.expiredLanes|=a),s&=~a}}function _d(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function x0(){var n=ba;return ba<<=1,!(ba&4194240)&&(ba=64),n}function Hc(n){for(var e=[],t=0;31>t;t++)e.push(n);return e}function ga(n,e,t){n.pendingLanes|=e,e!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,e=31-Qn(e),n[e]=t}function Jx(n,e){var t=n.pendingLanes&~e;n.pendingLanes=e,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=e,n.mutableReadLanes&=e,n.entangledLanes&=e,e=n.entanglements;var i=n.eventTimes;for(n=n.expirationTimes;0<t;){var r=31-Qn(t),s=1<<r;e[r]=0,i[r]=-1,n[r]=-1,t&=~s}}function gf(n,e){var t=n.entangledLanes|=e;for(n=n.entanglements;t;){var i=31-Qn(t),r=1<<i;r&e|n[i]&e&&(n[i]|=e),t&=~r}}var ot=0;function y0(n){return n&=-n,1<n?4<n?n&268435455?16:536870912:4:1}var M0,vf,S0,E0,w0,xd=!1,Ra=[],tr=null,nr=null,ir=null,Zo=new Map,Jo=new Map,Yi=[],Qx="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Dh(n,e){switch(n){case"focusin":case"focusout":tr=null;break;case"dragenter":case"dragleave":nr=null;break;case"mouseover":case"mouseout":ir=null;break;case"pointerover":case"pointerout":Zo.delete(e.pointerId);break;case"gotpointercapture":case"lostpointercapture":Jo.delete(e.pointerId)}}function po(n,e,t,i,r,s){return n===null||n.nativeEvent!==s?(n={blockedOn:e,domEventName:t,eventSystemFlags:i,nativeEvent:s,targetContainers:[r]},e!==null&&(e=_a(e),e!==null&&vf(e)),n):(n.eventSystemFlags|=i,e=n.targetContainers,r!==null&&e.indexOf(r)===-1&&e.push(r),n)}function ey(n,e,t,i,r){switch(e){case"focusin":return tr=po(tr,n,e,t,i,r),!0;case"dragenter":return nr=po(nr,n,e,t,i,r),!0;case"mouseover":return ir=po(ir,n,e,t,i,r),!0;case"pointerover":var s=r.pointerId;return Zo.set(s,po(Zo.get(s)||null,n,e,t,i,r)),!0;case"gotpointercapture":return s=r.pointerId,Jo.set(s,po(Jo.get(s)||null,n,e,t,i,r)),!0}return!1}function T0(n){var e=Dr(n.target);if(e!==null){var t=Xr(e);if(t!==null){if(e=t.tag,e===13){if(e=h0(t),e!==null){n.blockedOn=e,w0(n.priority,function(){S0(t)});return}}else if(e===3&&t.stateNode.current.memoizedState.isDehydrated){n.blockedOn=t.tag===3?t.stateNode.containerInfo:null;return}}}n.blockedOn=null}function pl(n){if(n.blockedOn!==null)return!1;for(var e=n.targetContainers;0<e.length;){var t=yd(n.domEventName,n.eventSystemFlags,e[0],n.nativeEvent);if(t===null){t=n.nativeEvent;var i=new t.constructor(t.type,t);pd=i,t.target.dispatchEvent(i),pd=null}else return e=_a(t),e!==null&&vf(e),n.blockedOn=t,!1;e.shift()}return!0}function Uh(n,e,t){pl(n)&&t.delete(e)}function ty(){xd=!1,tr!==null&&pl(tr)&&(tr=null),nr!==null&&pl(nr)&&(nr=null),ir!==null&&pl(ir)&&(ir=null),Zo.forEach(Uh),Jo.forEach(Uh)}function mo(n,e){n.blockedOn===e&&(n.blockedOn=null,xd||(xd=!0,Tn.unstable_scheduleCallback(Tn.unstable_NormalPriority,ty)))}function Qo(n){function e(r){return mo(r,n)}if(0<Ra.length){mo(Ra[0],n);for(var t=1;t<Ra.length;t++){var i=Ra[t];i.blockedOn===n&&(i.blockedOn=null)}}for(tr!==null&&mo(tr,n),nr!==null&&mo(nr,n),ir!==null&&mo(ir,n),Zo.forEach(e),Jo.forEach(e),t=0;t<Yi.length;t++)i=Yi[t],i.blockedOn===n&&(i.blockedOn=null);for(;0<Yi.length&&(t=Yi[0],t.blockedOn===null);)T0(t),t.blockedOn===null&&Yi.shift()}var Us=Ii.ReactCurrentBatchConfig,Ll=!0;function ny(n,e,t,i){var r=ot,s=Us.transition;Us.transition=null;try{ot=1,_f(n,e,t,i)}finally{ot=r,Us.transition=s}}function iy(n,e,t,i){var r=ot,s=Us.transition;Us.transition=null;try{ot=4,_f(n,e,t,i)}finally{ot=r,Us.transition=s}}function _f(n,e,t,i){if(Ll){var r=yd(n,e,t,i);if(r===null)Zc(n,e,i,Il,t),Dh(n,i);else if(ey(r,n,e,t,i))i.stopPropagation();else if(Dh(n,i),e&4&&-1<Qx.indexOf(n)){for(;r!==null;){var s=_a(r);if(s!==null&&M0(s),s=yd(n,e,t,i),s===null&&Zc(n,e,i,Il,t),s===r)break;r=s}r!==null&&i.stopPropagation()}else Zc(n,e,i,null,t)}}var Il=null;function yd(n,e,t,i){if(Il=null,n=pf(i),n=Dr(n),n!==null)if(e=Xr(n),e===null)n=null;else if(t=e.tag,t===13){if(n=h0(e),n!==null)return n;n=null}else if(t===3){if(e.stateNode.current.memoizedState.isDehydrated)return e.tag===3?e.stateNode.containerInfo:null;n=null}else e!==n&&(n=null);return Il=n,null}function A0(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Gx()){case mf:return 1;case v0:return 4;case Pl:case Wx:return 16;case _0:return 536870912;default:return 16}default:return 16}}var Ki=null,xf=null,ml=null;function b0(){if(ml)return ml;var n,e=xf,t=e.length,i,r="value"in Ki?Ki.value:Ki.textContent,s=r.length;for(n=0;n<t&&e[n]===r[n];n++);var o=t-n;for(i=1;i<=o&&e[t-i]===r[s-i];i++);return ml=r.slice(n,1<i?1-i:void 0)}function gl(n){var e=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&e===13&&(n=13)):n=e,n===10&&(n=13),32<=n||n===13?n:0}function Pa(){return!0}function Fh(){return!1}function bn(n){function e(t,i,r,s,o){this._reactName=t,this._targetInst=r,this.type=i,this.nativeEvent=s,this.target=o,this.currentTarget=null;for(var a in n)n.hasOwnProperty(a)&&(t=n[a],this[a]=t?t(s):s[a]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?Pa:Fh,this.isPropagationStopped=Fh,this}return xt(e.prototype,{preventDefault:function(){this.defaultPrevented=!0;var t=this.nativeEvent;t&&(t.preventDefault?t.preventDefault():typeof t.returnValue!="unknown"&&(t.returnValue=!1),this.isDefaultPrevented=Pa)},stopPropagation:function(){var t=this.nativeEvent;t&&(t.stopPropagation?t.stopPropagation():typeof t.cancelBubble!="unknown"&&(t.cancelBubble=!0),this.isPropagationStopped=Pa)},persist:function(){},isPersistent:Pa}),e}var no={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},yf=bn(no),va=xt({},no,{view:0,detail:0}),ry=bn(va),Vc,jc,go,fc=xt({},va,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Mf,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==go&&(go&&n.type==="mousemove"?(Vc=n.screenX-go.screenX,jc=n.screenY-go.screenY):jc=Vc=0,go=n),Vc)},movementY:function(n){return"movementY"in n?n.movementY:jc}}),Oh=bn(fc),sy=xt({},fc,{dataTransfer:0}),oy=bn(sy),ay=xt({},va,{relatedTarget:0}),Gc=bn(ay),ly=xt({},no,{animationName:0,elapsedTime:0,pseudoElement:0}),cy=bn(ly),uy=xt({},no,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),dy=bn(uy),fy=xt({},no,{data:0}),kh=bn(fy),hy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},py={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},my={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function gy(n){var e=this.nativeEvent;return e.getModifierState?e.getModifierState(n):(n=my[n])?!!e[n]:!1}function Mf(){return gy}var vy=xt({},va,{key:function(n){if(n.key){var e=hy[n.key]||n.key;if(e!=="Unidentified")return e}return n.type==="keypress"?(n=gl(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?py[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Mf,charCode:function(n){return n.type==="keypress"?gl(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?gl(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),_y=bn(vy),xy=xt({},fc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),zh=bn(xy),yy=xt({},va,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Mf}),My=bn(yy),Sy=xt({},no,{propertyName:0,elapsedTime:0,pseudoElement:0}),Ey=bn(Sy),wy=xt({},fc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),Ty=bn(wy),Ay=[9,13,27,32],Sf=Ri&&"CompositionEvent"in window,Oo=null;Ri&&"documentMode"in document&&(Oo=document.documentMode);var by=Ri&&"TextEvent"in window&&!Oo,C0=Ri&&(!Sf||Oo&&8<Oo&&11>=Oo),Bh=" ",Hh=!1;function R0(n,e){switch(n){case"keyup":return Ay.indexOf(e.keyCode)!==-1;case"keydown":return e.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function P0(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var ys=!1;function Cy(n,e){switch(n){case"compositionend":return P0(e);case"keypress":return e.which!==32?null:(Hh=!0,Bh);case"textInput":return n=e.data,n===Bh&&Hh?null:n;default:return null}}function Ry(n,e){if(ys)return n==="compositionend"||!Sf&&R0(n,e)?(n=b0(),ml=xf=Ki=null,ys=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(e.ctrlKey||e.altKey||e.metaKey)||e.ctrlKey&&e.altKey){if(e.char&&1<e.char.length)return e.char;if(e.which)return String.fromCharCode(e.which)}return null;case"compositionend":return C0&&e.locale!=="ko"?null:e.data;default:return null}}var Py={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Vh(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e==="input"?!!Py[n.type]:e==="textarea"}function N0(n,e,t,i){l0(i),e=Dl(e,"onChange"),0<e.length&&(t=new yf("onChange","change",null,t,i),n.push({event:t,listeners:e}))}var ko=null,ea=null;function Ny(n){V0(n,0)}function hc(n){var e=Es(n);if(t0(e))return n}function Ly(n,e){if(n==="change")return e}var L0=!1;if(Ri){var Wc;if(Ri){var Xc="oninput"in document;if(!Xc){var jh=document.createElement("div");jh.setAttribute("oninput","return;"),Xc=typeof jh.oninput=="function"}Wc=Xc}else Wc=!1;L0=Wc&&(!document.documentMode||9<document.documentMode)}function Gh(){ko&&(ko.detachEvent("onpropertychange",I0),ea=ko=null)}function I0(n){if(n.propertyName==="value"&&hc(ea)){var e=[];N0(e,ea,n,pf(n)),f0(Ny,e)}}function Iy(n,e,t){n==="focusin"?(Gh(),ko=e,ea=t,ko.attachEvent("onpropertychange",I0)):n==="focusout"&&Gh()}function Dy(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return hc(ea)}function Uy(n,e){if(n==="click")return hc(e)}function Fy(n,e){if(n==="input"||n==="change")return hc(e)}function Oy(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var ni=typeof Object.is=="function"?Object.is:Oy;function ta(n,e){if(ni(n,e))return!0;if(typeof n!="object"||n===null||typeof e!="object"||e===null)return!1;var t=Object.keys(n),i=Object.keys(e);if(t.length!==i.length)return!1;for(i=0;i<t.length;i++){var r=t[i];if(!nd.call(e,r)||!ni(n[r],e[r]))return!1}return!0}function Wh(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function Xh(n,e){var t=Wh(n);n=0;for(var i;t;){if(t.nodeType===3){if(i=n+t.textContent.length,n<=e&&i>=e)return{node:t,offset:e-n};n=i}e:{for(;t;){if(t.nextSibling){t=t.nextSibling;break e}t=t.parentNode}t=void 0}t=Wh(t)}}function D0(n,e){return n&&e?n===e?!0:n&&n.nodeType===3?!1:e&&e.nodeType===3?D0(n,e.parentNode):"contains"in n?n.contains(e):n.compareDocumentPosition?!!(n.compareDocumentPosition(e)&16):!1:!1}function U0(){for(var n=window,e=bl();e instanceof n.HTMLIFrameElement;){try{var t=typeof e.contentWindow.location.href=="string"}catch{t=!1}if(t)n=e.contentWindow;else break;e=bl(n.document)}return e}function Ef(n){var e=n&&n.nodeName&&n.nodeName.toLowerCase();return e&&(e==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||e==="textarea"||n.contentEditable==="true")}function ky(n){var e=U0(),t=n.focusedElem,i=n.selectionRange;if(e!==t&&t&&t.ownerDocument&&D0(t.ownerDocument.documentElement,t)){if(i!==null&&Ef(t)){if(e=i.start,n=i.end,n===void 0&&(n=e),"selectionStart"in t)t.selectionStart=e,t.selectionEnd=Math.min(n,t.value.length);else if(n=(e=t.ownerDocument||document)&&e.defaultView||window,n.getSelection){n=n.getSelection();var r=t.textContent.length,s=Math.min(i.start,r);i=i.end===void 0?s:Math.min(i.end,r),!n.extend&&s>i&&(r=i,i=s,s=r),r=Xh(t,s);var o=Xh(t,i);r&&o&&(n.rangeCount!==1||n.anchorNode!==r.node||n.anchorOffset!==r.offset||n.focusNode!==o.node||n.focusOffset!==o.offset)&&(e=e.createRange(),e.setStart(r.node,r.offset),n.removeAllRanges(),s>i?(n.addRange(e),n.extend(o.node,o.offset)):(e.setEnd(o.node,o.offset),n.addRange(e)))}}for(e=[],n=t;n=n.parentNode;)n.nodeType===1&&e.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof t.focus=="function"&&t.focus(),t=0;t<e.length;t++)n=e[t],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var zy=Ri&&"documentMode"in document&&11>=document.documentMode,Ms=null,Md=null,zo=null,Sd=!1;function $h(n,e,t){var i=t.window===t?t.document:t.nodeType===9?t:t.ownerDocument;Sd||Ms==null||Ms!==bl(i)||(i=Ms,"selectionStart"in i&&Ef(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),zo&&ta(zo,i)||(zo=i,i=Dl(Md,"onSelect"),0<i.length&&(e=new yf("onSelect","select",null,e,t),n.push({event:e,listeners:i}),e.target=Ms)))}function Na(n,e){var t={};return t[n.toLowerCase()]=e.toLowerCase(),t["Webkit"+n]="webkit"+e,t["Moz"+n]="moz"+e,t}var Ss={animationend:Na("Animation","AnimationEnd"),animationiteration:Na("Animation","AnimationIteration"),animationstart:Na("Animation","AnimationStart"),transitionend:Na("Transition","TransitionEnd")},$c={},F0={};Ri&&(F0=document.createElement("div").style,"AnimationEvent"in window||(delete Ss.animationend.animation,delete Ss.animationiteration.animation,delete Ss.animationstart.animation),"TransitionEvent"in window||delete Ss.transitionend.transition);function pc(n){if($c[n])return $c[n];if(!Ss[n])return n;var e=Ss[n],t;for(t in e)if(e.hasOwnProperty(t)&&t in F0)return $c[n]=e[t];return n}var O0=pc("animationend"),k0=pc("animationiteration"),z0=pc("animationstart"),B0=pc("transitionend"),H0=new Map,Yh="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function vr(n,e){H0.set(n,e),Wr(e,[n])}for(var Yc=0;Yc<Yh.length;Yc++){var qc=Yh[Yc],By=qc.toLowerCase(),Hy=qc[0].toUpperCase()+qc.slice(1);vr(By,"on"+Hy)}vr(O0,"onAnimationEnd");vr(k0,"onAnimationIteration");vr(z0,"onAnimationStart");vr("dblclick","onDoubleClick");vr("focusin","onFocus");vr("focusout","onBlur");vr(B0,"onTransitionEnd");Hs("onMouseEnter",["mouseout","mouseover"]);Hs("onMouseLeave",["mouseout","mouseover"]);Hs("onPointerEnter",["pointerout","pointerover"]);Hs("onPointerLeave",["pointerout","pointerover"]);Wr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Wr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Wr("onBeforeInput",["compositionend","keypress","textInput","paste"]);Wr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Wr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Wr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var No="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Vy=new Set("cancel close invalid load scroll toggle".split(" ").concat(No));function qh(n,e,t){var i=n.type||"unknown-event";n.currentTarget=t,Bx(i,e,void 0,n),n.currentTarget=null}function V0(n,e){e=(e&4)!==0;for(var t=0;t<n.length;t++){var i=n[t],r=i.event;i=i.listeners;e:{var s=void 0;if(e)for(var o=i.length-1;0<=o;o--){var a=i[o],l=a.instance,c=a.currentTarget;if(a=a.listener,l!==s&&r.isPropagationStopped())break e;qh(r,a,c),s=l}else for(o=0;o<i.length;o++){if(a=i[o],l=a.instance,c=a.currentTarget,a=a.listener,l!==s&&r.isPropagationStopped())break e;qh(r,a,c),s=l}}}if(Rl)throw n=vd,Rl=!1,vd=null,n}function ft(n,e){var t=e[bd];t===void 0&&(t=e[bd]=new Set);var i=n+"__bubble";t.has(i)||(j0(e,n,2,!1),t.add(i))}function Kc(n,e,t){var i=0;e&&(i|=4),j0(t,n,i,e)}var La="_reactListening"+Math.random().toString(36).slice(2);function na(n){if(!n[La]){n[La]=!0,Kg.forEach(function(t){t!=="selectionchange"&&(Vy.has(t)||Kc(t,!1,n),Kc(t,!0,n))});var e=n.nodeType===9?n:n.ownerDocument;e===null||e[La]||(e[La]=!0,Kc("selectionchange",!1,e))}}function j0(n,e,t,i){switch(A0(e)){case 1:var r=ny;break;case 4:r=iy;break;default:r=_f}t=r.bind(null,e,t,n),r=void 0,!gd||e!=="touchstart"&&e!=="touchmove"&&e!=="wheel"||(r=!0),i?r!==void 0?n.addEventListener(e,t,{capture:!0,passive:r}):n.addEventListener(e,t,!0):r!==void 0?n.addEventListener(e,t,{passive:r}):n.addEventListener(e,t,!1)}function Zc(n,e,t,i,r){var s=i;if(!(e&1)&&!(e&2)&&i!==null)e:for(;;){if(i===null)return;var o=i.tag;if(o===3||o===4){var a=i.stateNode.containerInfo;if(a===r||a.nodeType===8&&a.parentNode===r)break;if(o===4)for(o=i.return;o!==null;){var l=o.tag;if((l===3||l===4)&&(l=o.stateNode.containerInfo,l===r||l.nodeType===8&&l.parentNode===r))return;o=o.return}for(;a!==null;){if(o=Dr(a),o===null)return;if(l=o.tag,l===5||l===6){i=s=o;continue e}a=a.parentNode}}i=i.return}f0(function(){var c=s,u=pf(t),h=[];e:{var p=H0.get(n);if(p!==void 0){var f=yf,g=n;switch(n){case"keypress":if(gl(t)===0)break e;case"keydown":case"keyup":f=_y;break;case"focusin":g="focus",f=Gc;break;case"focusout":g="blur",f=Gc;break;case"beforeblur":case"afterblur":f=Gc;break;case"click":if(t.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":f=Oh;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":f=oy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":f=My;break;case O0:case k0:case z0:f=cy;break;case B0:f=Ey;break;case"scroll":f=ry;break;case"wheel":f=Ty;break;case"copy":case"cut":case"paste":f=dy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":f=zh}var y=(e&4)!==0,m=!y&&n==="scroll",d=y?p!==null?p+"Capture":null:p;y=[];for(var v=c,_;v!==null;){_=v;var M=_.stateNode;if(_.tag===5&&M!==null&&(_=M,d!==null&&(M=Ko(v,d),M!=null&&y.push(ia(v,M,_)))),m)break;v=v.return}0<y.length&&(p=new f(p,g,null,t,u),h.push({event:p,listeners:y}))}}if(!(e&7)){e:{if(p=n==="mouseover"||n==="pointerover",f=n==="mouseout"||n==="pointerout",p&&t!==pd&&(g=t.relatedTarget||t.fromElement)&&(Dr(g)||g[Pi]))break e;if((f||p)&&(p=u.window===u?u:(p=u.ownerDocument)?p.defaultView||p.parentWindow:window,f?(g=t.relatedTarget||t.toElement,f=c,g=g?Dr(g):null,g!==null&&(m=Xr(g),g!==m||g.tag!==5&&g.tag!==6)&&(g=null)):(f=null,g=c),f!==g)){if(y=Oh,M="onMouseLeave",d="onMouseEnter",v="mouse",(n==="pointerout"||n==="pointerover")&&(y=zh,M="onPointerLeave",d="onPointerEnter",v="pointer"),m=f==null?p:Es(f),_=g==null?p:Es(g),p=new y(M,v+"leave",f,t,u),p.target=m,p.relatedTarget=_,M=null,Dr(u)===c&&(y=new y(d,v+"enter",g,t,u),y.target=_,y.relatedTarget=m,M=y),m=M,f&&g)t:{for(y=f,d=g,v=0,_=y;_;_=qr(_))v++;for(_=0,M=d;M;M=qr(M))_++;for(;0<v-_;)y=qr(y),v--;for(;0<_-v;)d=qr(d),_--;for(;v--;){if(y===d||d!==null&&y===d.alternate)break t;y=qr(y),d=qr(d)}y=null}else y=null;f!==null&&Kh(h,p,f,y,!1),g!==null&&m!==null&&Kh(h,m,g,y,!0)}}e:{if(p=c?Es(c):window,f=p.nodeName&&p.nodeName.toLowerCase(),f==="select"||f==="input"&&p.type==="file")var T=Ly;else if(Vh(p))if(L0)T=Fy;else{T=Dy;var b=Iy}else(f=p.nodeName)&&f.toLowerCase()==="input"&&(p.type==="checkbox"||p.type==="radio")&&(T=Uy);if(T&&(T=T(n,c))){N0(h,T,t,u);break e}b&&b(n,p,c),n==="focusout"&&(b=p._wrapperState)&&b.controlled&&p.type==="number"&&cd(p,"number",p.value)}switch(b=c?Es(c):window,n){case"focusin":(Vh(b)||b.contentEditable==="true")&&(Ms=b,Md=c,zo=null);break;case"focusout":zo=Md=Ms=null;break;case"mousedown":Sd=!0;break;case"contextmenu":case"mouseup":case"dragend":Sd=!1,$h(h,t,u);break;case"selectionchange":if(zy)break;case"keydown":case"keyup":$h(h,t,u)}var E;if(Sf)e:{switch(n){case"compositionstart":var P="onCompositionStart";break e;case"compositionend":P="onCompositionEnd";break e;case"compositionupdate":P="onCompositionUpdate";break e}P=void 0}else ys?R0(n,t)&&(P="onCompositionEnd"):n==="keydown"&&t.keyCode===229&&(P="onCompositionStart");P&&(C0&&t.locale!=="ko"&&(ys||P!=="onCompositionStart"?P==="onCompositionEnd"&&ys&&(E=b0()):(Ki=u,xf="value"in Ki?Ki.value:Ki.textContent,ys=!0)),b=Dl(c,P),0<b.length&&(P=new kh(P,n,null,t,u),h.push({event:P,listeners:b}),E?P.data=E:(E=P0(t),E!==null&&(P.data=E)))),(E=by?Cy(n,t):Ry(n,t))&&(c=Dl(c,"onBeforeInput"),0<c.length&&(u=new kh("onBeforeInput","beforeinput",null,t,u),h.push({event:u,listeners:c}),u.data=E))}V0(h,e)})}function ia(n,e,t){return{instance:n,listener:e,currentTarget:t}}function Dl(n,e){for(var t=e+"Capture",i=[];n!==null;){var r=n,s=r.stateNode;r.tag===5&&s!==null&&(r=s,s=Ko(n,t),s!=null&&i.unshift(ia(n,s,r)),s=Ko(n,e),s!=null&&i.push(ia(n,s,r))),n=n.return}return i}function qr(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Kh(n,e,t,i,r){for(var s=e._reactName,o=[];t!==null&&t!==i;){var a=t,l=a.alternate,c=a.stateNode;if(l!==null&&l===i)break;a.tag===5&&c!==null&&(a=c,r?(l=Ko(t,s),l!=null&&o.unshift(ia(t,l,a))):r||(l=Ko(t,s),l!=null&&o.push(ia(t,l,a)))),t=t.return}o.length!==0&&n.push({event:e,listeners:o})}var jy=/\r\n?/g,Gy=/\u0000|\uFFFD/g;function Zh(n){return(typeof n=="string"?n:""+n).replace(jy,`
`).replace(Gy,"")}function Ia(n,e,t){if(e=Zh(e),Zh(n)!==e&&t)throw Error(ue(425))}function Ul(){}var Ed=null,wd=null;function Td(n,e){return n==="textarea"||n==="noscript"||typeof e.children=="string"||typeof e.children=="number"||typeof e.dangerouslySetInnerHTML=="object"&&e.dangerouslySetInnerHTML!==null&&e.dangerouslySetInnerHTML.__html!=null}var Ad=typeof setTimeout=="function"?setTimeout:void 0,Wy=typeof clearTimeout=="function"?clearTimeout:void 0,Jh=typeof Promise=="function"?Promise:void 0,Xy=typeof queueMicrotask=="function"?queueMicrotask:typeof Jh<"u"?function(n){return Jh.resolve(null).then(n).catch($y)}:Ad;function $y(n){setTimeout(function(){throw n})}function Jc(n,e){var t=e,i=0;do{var r=t.nextSibling;if(n.removeChild(t),r&&r.nodeType===8)if(t=r.data,t==="/$"){if(i===0){n.removeChild(r),Qo(e);return}i--}else t!=="$"&&t!=="$?"&&t!=="$!"||i++;t=r}while(t);Qo(e)}function rr(n){for(;n!=null;n=n.nextSibling){var e=n.nodeType;if(e===1||e===3)break;if(e===8){if(e=n.data,e==="$"||e==="$!"||e==="$?")break;if(e==="/$")return null}}return n}function Qh(n){n=n.previousSibling;for(var e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="$"||t==="$!"||t==="$?"){if(e===0)return n;e--}else t==="/$"&&e++}n=n.previousSibling}return null}var io=Math.random().toString(36).slice(2),ai="__reactFiber$"+io,ra="__reactProps$"+io,Pi="__reactContainer$"+io,bd="__reactEvents$"+io,Yy="__reactListeners$"+io,qy="__reactHandles$"+io;function Dr(n){var e=n[ai];if(e)return e;for(var t=n.parentNode;t;){if(e=t[Pi]||t[ai]){if(t=e.alternate,e.child!==null||t!==null&&t.child!==null)for(n=Qh(n);n!==null;){if(t=n[ai])return t;n=Qh(n)}return e}n=t,t=n.parentNode}return null}function _a(n){return n=n[ai]||n[Pi],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Es(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(ue(33))}function mc(n){return n[ra]||null}var Cd=[],ws=-1;function _r(n){return{current:n}}function ht(n){0>ws||(n.current=Cd[ws],Cd[ws]=null,ws--)}function ut(n,e){ws++,Cd[ws]=n.current,n.current=e}var fr={},en=_r(fr),un=_r(!1),Br=fr;function Vs(n,e){var t=n.type.contextTypes;if(!t)return fr;var i=n.stateNode;if(i&&i.__reactInternalMemoizedUnmaskedChildContext===e)return i.__reactInternalMemoizedMaskedChildContext;var r={},s;for(s in t)r[s]=e[s];return i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=e,n.__reactInternalMemoizedMaskedChildContext=r),r}function dn(n){return n=n.childContextTypes,n!=null}function Fl(){ht(un),ht(en)}function ep(n,e,t){if(en.current!==fr)throw Error(ue(168));ut(en,e),ut(un,t)}function G0(n,e,t){var i=n.stateNode;if(e=e.childContextTypes,typeof i.getChildContext!="function")return t;i=i.getChildContext();for(var r in i)if(!(r in e))throw Error(ue(108,Ix(n)||"Unknown",r));return xt({},t,i)}function Ol(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||fr,Br=en.current,ut(en,n),ut(un,un.current),!0}function tp(n,e,t){var i=n.stateNode;if(!i)throw Error(ue(169));t?(n=G0(n,e,Br),i.__reactInternalMemoizedMergedChildContext=n,ht(un),ht(en),ut(en,n)):ht(un),ut(un,t)}var Si=null,gc=!1,Qc=!1;function W0(n){Si===null?Si=[n]:Si.push(n)}function Ky(n){gc=!0,W0(n)}function xr(){if(!Qc&&Si!==null){Qc=!0;var n=0,e=ot;try{var t=Si;for(ot=1;n<t.length;n++){var i=t[n];do i=i(!0);while(i!==null)}Si=null,gc=!1}catch(r){throw Si!==null&&(Si=Si.slice(n+1)),g0(mf,xr),r}finally{ot=e,Qc=!1}}return null}var Ts=[],As=0,kl=null,zl=0,Ln=[],In=0,Hr=null,wi=1,Ti="";function Cr(n,e){Ts[As++]=zl,Ts[As++]=kl,kl=n,zl=e}function X0(n,e,t){Ln[In++]=wi,Ln[In++]=Ti,Ln[In++]=Hr,Hr=n;var i=wi;n=Ti;var r=32-Qn(i)-1;i&=~(1<<r),t+=1;var s=32-Qn(e)+r;if(30<s){var o=r-r%5;s=(i&(1<<o)-1).toString(32),i>>=o,r-=o,wi=1<<32-Qn(e)+r|t<<r|i,Ti=s+n}else wi=1<<s|t<<r|i,Ti=n}function wf(n){n.return!==null&&(Cr(n,1),X0(n,1,0))}function Tf(n){for(;n===kl;)kl=Ts[--As],Ts[As]=null,zl=Ts[--As],Ts[As]=null;for(;n===Hr;)Hr=Ln[--In],Ln[In]=null,Ti=Ln[--In],Ln[In]=null,wi=Ln[--In],Ln[In]=null}var wn=null,Mn=null,mt=!1,Kn=null;function $0(n,e){var t=On(5,null,null,0);t.elementType="DELETED",t.stateNode=e,t.return=n,e=n.deletions,e===null?(n.deletions=[t],n.flags|=16):e.push(t)}function np(n,e){switch(n.tag){case 5:var t=n.type;return e=e.nodeType!==1||t.toLowerCase()!==e.nodeName.toLowerCase()?null:e,e!==null?(n.stateNode=e,wn=n,Mn=rr(e.firstChild),!0):!1;case 6:return e=n.pendingProps===""||e.nodeType!==3?null:e,e!==null?(n.stateNode=e,wn=n,Mn=null,!0):!1;case 13:return e=e.nodeType!==8?null:e,e!==null?(t=Hr!==null?{id:wi,overflow:Ti}:null,n.memoizedState={dehydrated:e,treeContext:t,retryLane:1073741824},t=On(18,null,null,0),t.stateNode=e,t.return=n,n.child=t,wn=n,Mn=null,!0):!1;default:return!1}}function Rd(n){return(n.mode&1)!==0&&(n.flags&128)===0}function Pd(n){if(mt){var e=Mn;if(e){var t=e;if(!np(n,e)){if(Rd(n))throw Error(ue(418));e=rr(t.nextSibling);var i=wn;e&&np(n,e)?$0(i,t):(n.flags=n.flags&-4097|2,mt=!1,wn=n)}}else{if(Rd(n))throw Error(ue(418));n.flags=n.flags&-4097|2,mt=!1,wn=n}}}function ip(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;wn=n}function Da(n){if(n!==wn)return!1;if(!mt)return ip(n),mt=!0,!1;var e;if((e=n.tag!==3)&&!(e=n.tag!==5)&&(e=n.type,e=e!=="head"&&e!=="body"&&!Td(n.type,n.memoizedProps)),e&&(e=Mn)){if(Rd(n))throw Y0(),Error(ue(418));for(;e;)$0(n,e),e=rr(e.nextSibling)}if(ip(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(ue(317));e:{for(n=n.nextSibling,e=0;n;){if(n.nodeType===8){var t=n.data;if(t==="/$"){if(e===0){Mn=rr(n.nextSibling);break e}e--}else t!=="$"&&t!=="$!"&&t!=="$?"||e++}n=n.nextSibling}Mn=null}}else Mn=wn?rr(n.stateNode.nextSibling):null;return!0}function Y0(){for(var n=Mn;n;)n=rr(n.nextSibling)}function js(){Mn=wn=null,mt=!1}function Af(n){Kn===null?Kn=[n]:Kn.push(n)}var Zy=Ii.ReactCurrentBatchConfig;function vo(n,e,t){if(n=t.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(t._owner){if(t=t._owner,t){if(t.tag!==1)throw Error(ue(309));var i=t.stateNode}if(!i)throw Error(ue(147,n));var r=i,s=""+n;return e!==null&&e.ref!==null&&typeof e.ref=="function"&&e.ref._stringRef===s?e.ref:(e=function(o){var a=r.refs;o===null?delete a[s]:a[s]=o},e._stringRef=s,e)}if(typeof n!="string")throw Error(ue(284));if(!t._owner)throw Error(ue(290,n))}return n}function Ua(n,e){throw n=Object.prototype.toString.call(e),Error(ue(31,n==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":n))}function rp(n){var e=n._init;return e(n._payload)}function q0(n){function e(d,v){if(n){var _=d.deletions;_===null?(d.deletions=[v],d.flags|=16):_.push(v)}}function t(d,v){if(!n)return null;for(;v!==null;)e(d,v),v=v.sibling;return null}function i(d,v){for(d=new Map;v!==null;)v.key!==null?d.set(v.key,v):d.set(v.index,v),v=v.sibling;return d}function r(d,v){return d=lr(d,v),d.index=0,d.sibling=null,d}function s(d,v,_){return d.index=_,n?(_=d.alternate,_!==null?(_=_.index,_<v?(d.flags|=2,v):_):(d.flags|=2,v)):(d.flags|=1048576,v)}function o(d){return n&&d.alternate===null&&(d.flags|=2),d}function a(d,v,_,M){return v===null||v.tag!==6?(v=ou(_,d.mode,M),v.return=d,v):(v=r(v,_),v.return=d,v)}function l(d,v,_,M){var T=_.type;return T===xs?u(d,v,_.props.children,M,_.key):v!==null&&(v.elementType===T||typeof T=="object"&&T!==null&&T.$$typeof===Wi&&rp(T)===v.type)?(M=r(v,_.props),M.ref=vo(d,v,_),M.return=d,M):(M=El(_.type,_.key,_.props,null,d.mode,M),M.ref=vo(d,v,_),M.return=d,M)}function c(d,v,_,M){return v===null||v.tag!==4||v.stateNode.containerInfo!==_.containerInfo||v.stateNode.implementation!==_.implementation?(v=au(_,d.mode,M),v.return=d,v):(v=r(v,_.children||[]),v.return=d,v)}function u(d,v,_,M,T){return v===null||v.tag!==7?(v=zr(_,d.mode,M,T),v.return=d,v):(v=r(v,_),v.return=d,v)}function h(d,v,_){if(typeof v=="string"&&v!==""||typeof v=="number")return v=ou(""+v,d.mode,_),v.return=d,v;if(typeof v=="object"&&v!==null){switch(v.$$typeof){case wa:return _=El(v.type,v.key,v.props,null,d.mode,_),_.ref=vo(d,null,v),_.return=d,_;case _s:return v=au(v,d.mode,_),v.return=d,v;case Wi:var M=v._init;return h(d,M(v._payload),_)}if(Ro(v)||fo(v))return v=zr(v,d.mode,_,null),v.return=d,v;Ua(d,v)}return null}function p(d,v,_,M){var T=v!==null?v.key:null;if(typeof _=="string"&&_!==""||typeof _=="number")return T!==null?null:a(d,v,""+_,M);if(typeof _=="object"&&_!==null){switch(_.$$typeof){case wa:return _.key===T?l(d,v,_,M):null;case _s:return _.key===T?c(d,v,_,M):null;case Wi:return T=_._init,p(d,v,T(_._payload),M)}if(Ro(_)||fo(_))return T!==null?null:u(d,v,_,M,null);Ua(d,_)}return null}function f(d,v,_,M,T){if(typeof M=="string"&&M!==""||typeof M=="number")return d=d.get(_)||null,a(v,d,""+M,T);if(typeof M=="object"&&M!==null){switch(M.$$typeof){case wa:return d=d.get(M.key===null?_:M.key)||null,l(v,d,M,T);case _s:return d=d.get(M.key===null?_:M.key)||null,c(v,d,M,T);case Wi:var b=M._init;return f(d,v,_,b(M._payload),T)}if(Ro(M)||fo(M))return d=d.get(_)||null,u(v,d,M,T,null);Ua(v,M)}return null}function g(d,v,_,M){for(var T=null,b=null,E=v,P=v=0,A=null;E!==null&&P<_.length;P++){E.index>P?(A=E,E=null):A=E.sibling;var S=p(d,E,_[P],M);if(S===null){E===null&&(E=A);break}n&&E&&S.alternate===null&&e(d,E),v=s(S,v,P),b===null?T=S:b.sibling=S,b=S,E=A}if(P===_.length)return t(d,E),mt&&Cr(d,P),T;if(E===null){for(;P<_.length;P++)E=h(d,_[P],M),E!==null&&(v=s(E,v,P),b===null?T=E:b.sibling=E,b=E);return mt&&Cr(d,P),T}for(E=i(d,E);P<_.length;P++)A=f(E,d,P,_[P],M),A!==null&&(n&&A.alternate!==null&&E.delete(A.key===null?P:A.key),v=s(A,v,P),b===null?T=A:b.sibling=A,b=A);return n&&E.forEach(function(D){return e(d,D)}),mt&&Cr(d,P),T}function y(d,v,_,M){var T=fo(_);if(typeof T!="function")throw Error(ue(150));if(_=T.call(_),_==null)throw Error(ue(151));for(var b=T=null,E=v,P=v=0,A=null,S=_.next();E!==null&&!S.done;P++,S=_.next()){E.index>P?(A=E,E=null):A=E.sibling;var D=p(d,E,S.value,M);if(D===null){E===null&&(E=A);break}n&&E&&D.alternate===null&&e(d,E),v=s(D,v,P),b===null?T=D:b.sibling=D,b=D,E=A}if(S.done)return t(d,E),mt&&Cr(d,P),T;if(E===null){for(;!S.done;P++,S=_.next())S=h(d,S.value,M),S!==null&&(v=s(S,v,P),b===null?T=S:b.sibling=S,b=S);return mt&&Cr(d,P),T}for(E=i(d,E);!S.done;P++,S=_.next())S=f(E,d,P,S.value,M),S!==null&&(n&&S.alternate!==null&&E.delete(S.key===null?P:S.key),v=s(S,v,P),b===null?T=S:b.sibling=S,b=S);return n&&E.forEach(function(B){return e(d,B)}),mt&&Cr(d,P),T}function m(d,v,_,M){if(typeof _=="object"&&_!==null&&_.type===xs&&_.key===null&&(_=_.props.children),typeof _=="object"&&_!==null){switch(_.$$typeof){case wa:e:{for(var T=_.key,b=v;b!==null;){if(b.key===T){if(T=_.type,T===xs){if(b.tag===7){t(d,b.sibling),v=r(b,_.props.children),v.return=d,d=v;break e}}else if(b.elementType===T||typeof T=="object"&&T!==null&&T.$$typeof===Wi&&rp(T)===b.type){t(d,b.sibling),v=r(b,_.props),v.ref=vo(d,b,_),v.return=d,d=v;break e}t(d,b);break}else e(d,b);b=b.sibling}_.type===xs?(v=zr(_.props.children,d.mode,M,_.key),v.return=d,d=v):(M=El(_.type,_.key,_.props,null,d.mode,M),M.ref=vo(d,v,_),M.return=d,d=M)}return o(d);case _s:e:{for(b=_.key;v!==null;){if(v.key===b)if(v.tag===4&&v.stateNode.containerInfo===_.containerInfo&&v.stateNode.implementation===_.implementation){t(d,v.sibling),v=r(v,_.children||[]),v.return=d,d=v;break e}else{t(d,v);break}else e(d,v);v=v.sibling}v=au(_,d.mode,M),v.return=d,d=v}return o(d);case Wi:return b=_._init,m(d,v,b(_._payload),M)}if(Ro(_))return g(d,v,_,M);if(fo(_))return y(d,v,_,M);Ua(d,_)}return typeof _=="string"&&_!==""||typeof _=="number"?(_=""+_,v!==null&&v.tag===6?(t(d,v.sibling),v=r(v,_),v.return=d,d=v):(t(d,v),v=ou(_,d.mode,M),v.return=d,d=v),o(d)):t(d,v)}return m}var Gs=q0(!0),K0=q0(!1),Bl=_r(null),Hl=null,bs=null,bf=null;function Cf(){bf=bs=Hl=null}function Rf(n){var e=Bl.current;ht(Bl),n._currentValue=e}function Nd(n,e,t){for(;n!==null;){var i=n.alternate;if((n.childLanes&e)!==e?(n.childLanes|=e,i!==null&&(i.childLanes|=e)):i!==null&&(i.childLanes&e)!==e&&(i.childLanes|=e),n===t)break;n=n.return}}function Fs(n,e){Hl=n,bf=bs=null,n=n.dependencies,n!==null&&n.firstContext!==null&&(n.lanes&e&&(cn=!0),n.firstContext=null)}function Hn(n){var e=n._currentValue;if(bf!==n)if(n={context:n,memoizedValue:e,next:null},bs===null){if(Hl===null)throw Error(ue(308));bs=n,Hl.dependencies={lanes:0,firstContext:n}}else bs=bs.next=n;return e}var Ur=null;function Pf(n){Ur===null?Ur=[n]:Ur.push(n)}function Z0(n,e,t,i){var r=e.interleaved;return r===null?(t.next=t,Pf(e)):(t.next=r.next,r.next=t),e.interleaved=t,Ni(n,i)}function Ni(n,e){n.lanes|=e;var t=n.alternate;for(t!==null&&(t.lanes|=e),t=n,n=n.return;n!==null;)n.childLanes|=e,t=n.alternate,t!==null&&(t.childLanes|=e),t=n,n=n.return;return t.tag===3?t.stateNode:null}var Xi=!1;function Nf(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function J0(n,e){n=n.updateQueue,e.updateQueue===n&&(e.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function bi(n,e){return{eventTime:n,lane:e,tag:0,payload:null,callback:null,next:null}}function sr(n,e,t){var i=n.updateQueue;if(i===null)return null;if(i=i.shared,Je&2){var r=i.pending;return r===null?e.next=e:(e.next=r.next,r.next=e),i.pending=e,Ni(n,t)}return r=i.interleaved,r===null?(e.next=e,Pf(i)):(e.next=r.next,r.next=e),i.interleaved=e,Ni(n,t)}function vl(n,e,t){if(e=e.updateQueue,e!==null&&(e=e.shared,(t&4194240)!==0)){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,gf(n,t)}}function sp(n,e){var t=n.updateQueue,i=n.alternate;if(i!==null&&(i=i.updateQueue,t===i)){var r=null,s=null;if(t=t.firstBaseUpdate,t!==null){do{var o={eventTime:t.eventTime,lane:t.lane,tag:t.tag,payload:t.payload,callback:t.callback,next:null};s===null?r=s=o:s=s.next=o,t=t.next}while(t!==null);s===null?r=s=e:s=s.next=e}else r=s=e;t={baseState:i.baseState,firstBaseUpdate:r,lastBaseUpdate:s,shared:i.shared,effects:i.effects},n.updateQueue=t;return}n=t.lastBaseUpdate,n===null?t.firstBaseUpdate=e:n.next=e,t.lastBaseUpdate=e}function Vl(n,e,t,i){var r=n.updateQueue;Xi=!1;var s=r.firstBaseUpdate,o=r.lastBaseUpdate,a=r.shared.pending;if(a!==null){r.shared.pending=null;var l=a,c=l.next;l.next=null,o===null?s=c:o.next=c,o=l;var u=n.alternate;u!==null&&(u=u.updateQueue,a=u.lastBaseUpdate,a!==o&&(a===null?u.firstBaseUpdate=c:a.next=c,u.lastBaseUpdate=l))}if(s!==null){var h=r.baseState;o=0,u=c=l=null,a=s;do{var p=a.lane,f=a.eventTime;if((i&p)===p){u!==null&&(u=u.next={eventTime:f,lane:0,tag:a.tag,payload:a.payload,callback:a.callback,next:null});e:{var g=n,y=a;switch(p=e,f=t,y.tag){case 1:if(g=y.payload,typeof g=="function"){h=g.call(f,h,p);break e}h=g;break e;case 3:g.flags=g.flags&-65537|128;case 0:if(g=y.payload,p=typeof g=="function"?g.call(f,h,p):g,p==null)break e;h=xt({},h,p);break e;case 2:Xi=!0}}a.callback!==null&&a.lane!==0&&(n.flags|=64,p=r.effects,p===null?r.effects=[a]:p.push(a))}else f={eventTime:f,lane:p,tag:a.tag,payload:a.payload,callback:a.callback,next:null},u===null?(c=u=f,l=h):u=u.next=f,o|=p;if(a=a.next,a===null){if(a=r.shared.pending,a===null)break;p=a,a=p.next,p.next=null,r.lastBaseUpdate=p,r.shared.pending=null}}while(!0);if(u===null&&(l=h),r.baseState=l,r.firstBaseUpdate=c,r.lastBaseUpdate=u,e=r.shared.interleaved,e!==null){r=e;do o|=r.lane,r=r.next;while(r!==e)}else s===null&&(r.shared.lanes=0);jr|=o,n.lanes=o,n.memoizedState=h}}function op(n,e,t){if(n=e.effects,e.effects=null,n!==null)for(e=0;e<n.length;e++){var i=n[e],r=i.callback;if(r!==null){if(i.callback=null,i=t,typeof r!="function")throw Error(ue(191,r));r.call(i)}}}var xa={},ui=_r(xa),sa=_r(xa),oa=_r(xa);function Fr(n){if(n===xa)throw Error(ue(174));return n}function Lf(n,e){switch(ut(oa,e),ut(sa,n),ut(ui,xa),n=e.nodeType,n){case 9:case 11:e=(e=e.documentElement)?e.namespaceURI:dd(null,"");break;default:n=n===8?e.parentNode:e,e=n.namespaceURI||null,n=n.tagName,e=dd(e,n)}ht(ui),ut(ui,e)}function Ws(){ht(ui),ht(sa),ht(oa)}function Q0(n){Fr(oa.current);var e=Fr(ui.current),t=dd(e,n.type);e!==t&&(ut(sa,n),ut(ui,t))}function If(n){sa.current===n&&(ht(ui),ht(sa))}var vt=_r(0);function jl(n){for(var e=n;e!==null;){if(e.tag===13){var t=e.memoizedState;if(t!==null&&(t=t.dehydrated,t===null||t.data==="$?"||t.data==="$!"))return e}else if(e.tag===19&&e.memoizedProps.revealOrder!==void 0){if(e.flags&128)return e}else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return null;e=e.return}e.sibling.return=e.return,e=e.sibling}return null}var eu=[];function Df(){for(var n=0;n<eu.length;n++)eu[n]._workInProgressVersionPrimary=null;eu.length=0}var _l=Ii.ReactCurrentDispatcher,tu=Ii.ReactCurrentBatchConfig,Vr=0,_t=null,Ct=null,Dt=null,Gl=!1,Bo=!1,aa=0,Jy=0;function $t(){throw Error(ue(321))}function Uf(n,e){if(e===null)return!1;for(var t=0;t<e.length&&t<n.length;t++)if(!ni(n[t],e[t]))return!1;return!0}function Ff(n,e,t,i,r,s){if(Vr=s,_t=e,e.memoizedState=null,e.updateQueue=null,e.lanes=0,_l.current=n===null||n.memoizedState===null?nM:iM,n=t(i,r),Bo){s=0;do{if(Bo=!1,aa=0,25<=s)throw Error(ue(301));s+=1,Dt=Ct=null,e.updateQueue=null,_l.current=rM,n=t(i,r)}while(Bo)}if(_l.current=Wl,e=Ct!==null&&Ct.next!==null,Vr=0,Dt=Ct=_t=null,Gl=!1,e)throw Error(ue(300));return n}function Of(){var n=aa!==0;return aa=0,n}function si(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Dt===null?_t.memoizedState=Dt=n:Dt=Dt.next=n,Dt}function Vn(){if(Ct===null){var n=_t.alternate;n=n!==null?n.memoizedState:null}else n=Ct.next;var e=Dt===null?_t.memoizedState:Dt.next;if(e!==null)Dt=e,Ct=n;else{if(n===null)throw Error(ue(310));Ct=n,n={memoizedState:Ct.memoizedState,baseState:Ct.baseState,baseQueue:Ct.baseQueue,queue:Ct.queue,next:null},Dt===null?_t.memoizedState=Dt=n:Dt=Dt.next=n}return Dt}function la(n,e){return typeof e=="function"?e(n):e}function nu(n){var e=Vn(),t=e.queue;if(t===null)throw Error(ue(311));t.lastRenderedReducer=n;var i=Ct,r=i.baseQueue,s=t.pending;if(s!==null){if(r!==null){var o=r.next;r.next=s.next,s.next=o}i.baseQueue=r=s,t.pending=null}if(r!==null){s=r.next,i=i.baseState;var a=o=null,l=null,c=s;do{var u=c.lane;if((Vr&u)===u)l!==null&&(l=l.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),i=c.hasEagerState?c.eagerState:n(i,c.action);else{var h={lane:u,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};l===null?(a=l=h,o=i):l=l.next=h,_t.lanes|=u,jr|=u}c=c.next}while(c!==null&&c!==s);l===null?o=i:l.next=a,ni(i,e.memoizedState)||(cn=!0),e.memoizedState=i,e.baseState=o,e.baseQueue=l,t.lastRenderedState=i}if(n=t.interleaved,n!==null){r=n;do s=r.lane,_t.lanes|=s,jr|=s,r=r.next;while(r!==n)}else r===null&&(t.lanes=0);return[e.memoizedState,t.dispatch]}function iu(n){var e=Vn(),t=e.queue;if(t===null)throw Error(ue(311));t.lastRenderedReducer=n;var i=t.dispatch,r=t.pending,s=e.memoizedState;if(r!==null){t.pending=null;var o=r=r.next;do s=n(s,o.action),o=o.next;while(o!==r);ni(s,e.memoizedState)||(cn=!0),e.memoizedState=s,e.baseQueue===null&&(e.baseState=s),t.lastRenderedState=s}return[s,i]}function ev(){}function tv(n,e){var t=_t,i=Vn(),r=e(),s=!ni(i.memoizedState,r);if(s&&(i.memoizedState=r,cn=!0),i=i.queue,kf(rv.bind(null,t,i,n),[n]),i.getSnapshot!==e||s||Dt!==null&&Dt.memoizedState.tag&1){if(t.flags|=2048,ca(9,iv.bind(null,t,i,r,e),void 0,null),Ft===null)throw Error(ue(349));Vr&30||nv(t,e,r)}return r}function nv(n,e,t){n.flags|=16384,n={getSnapshot:e,value:t},e=_t.updateQueue,e===null?(e={lastEffect:null,stores:null},_t.updateQueue=e,e.stores=[n]):(t=e.stores,t===null?e.stores=[n]:t.push(n))}function iv(n,e,t,i){e.value=t,e.getSnapshot=i,sv(e)&&ov(n)}function rv(n,e,t){return t(function(){sv(e)&&ov(n)})}function sv(n){var e=n.getSnapshot;n=n.value;try{var t=e();return!ni(n,t)}catch{return!0}}function ov(n){var e=Ni(n,1);e!==null&&ei(e,n,1,-1)}function ap(n){var e=si();return typeof n=="function"&&(n=n()),e.memoizedState=e.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:la,lastRenderedState:n},e.queue=n,n=n.dispatch=tM.bind(null,_t,n),[e.memoizedState,n]}function ca(n,e,t,i){return n={tag:n,create:e,destroy:t,deps:i,next:null},e=_t.updateQueue,e===null?(e={lastEffect:null,stores:null},_t.updateQueue=e,e.lastEffect=n.next=n):(t=e.lastEffect,t===null?e.lastEffect=n.next=n:(i=t.next,t.next=n,n.next=i,e.lastEffect=n)),n}function av(){return Vn().memoizedState}function xl(n,e,t,i){var r=si();_t.flags|=n,r.memoizedState=ca(1|e,t,void 0,i===void 0?null:i)}function vc(n,e,t,i){var r=Vn();i=i===void 0?null:i;var s=void 0;if(Ct!==null){var o=Ct.memoizedState;if(s=o.destroy,i!==null&&Uf(i,o.deps)){r.memoizedState=ca(e,t,s,i);return}}_t.flags|=n,r.memoizedState=ca(1|e,t,s,i)}function lp(n,e){return xl(8390656,8,n,e)}function kf(n,e){return vc(2048,8,n,e)}function lv(n,e){return vc(4,2,n,e)}function cv(n,e){return vc(4,4,n,e)}function uv(n,e){if(typeof e=="function")return n=n(),e(n),function(){e(null)};if(e!=null)return n=n(),e.current=n,function(){e.current=null}}function dv(n,e,t){return t=t!=null?t.concat([n]):null,vc(4,4,uv.bind(null,e,n),t)}function zf(){}function fv(n,e){var t=Vn();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&Uf(e,i[1])?i[0]:(t.memoizedState=[n,e],n)}function hv(n,e){var t=Vn();e=e===void 0?null:e;var i=t.memoizedState;return i!==null&&e!==null&&Uf(e,i[1])?i[0]:(n=n(),t.memoizedState=[n,e],n)}function pv(n,e,t){return Vr&21?(ni(t,e)||(t=x0(),_t.lanes|=t,jr|=t,n.baseState=!0),e):(n.baseState&&(n.baseState=!1,cn=!0),n.memoizedState=t)}function Qy(n,e){var t=ot;ot=t!==0&&4>t?t:4,n(!0);var i=tu.transition;tu.transition={};try{n(!1),e()}finally{ot=t,tu.transition=i}}function mv(){return Vn().memoizedState}function eM(n,e,t){var i=ar(n);if(t={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null},gv(n))vv(e,t);else if(t=Z0(n,e,t,i),t!==null){var r=sn();ei(t,n,i,r),_v(t,e,i)}}function tM(n,e,t){var i=ar(n),r={lane:i,action:t,hasEagerState:!1,eagerState:null,next:null};if(gv(n))vv(e,r);else{var s=n.alternate;if(n.lanes===0&&(s===null||s.lanes===0)&&(s=e.lastRenderedReducer,s!==null))try{var o=e.lastRenderedState,a=s(o,t);if(r.hasEagerState=!0,r.eagerState=a,ni(a,o)){var l=e.interleaved;l===null?(r.next=r,Pf(e)):(r.next=l.next,l.next=r),e.interleaved=r;return}}catch{}finally{}t=Z0(n,e,r,i),t!==null&&(r=sn(),ei(t,n,i,r),_v(t,e,i))}}function gv(n){var e=n.alternate;return n===_t||e!==null&&e===_t}function vv(n,e){Bo=Gl=!0;var t=n.pending;t===null?e.next=e:(e.next=t.next,t.next=e),n.pending=e}function _v(n,e,t){if(t&4194240){var i=e.lanes;i&=n.pendingLanes,t|=i,e.lanes=t,gf(n,t)}}var Wl={readContext:Hn,useCallback:$t,useContext:$t,useEffect:$t,useImperativeHandle:$t,useInsertionEffect:$t,useLayoutEffect:$t,useMemo:$t,useReducer:$t,useRef:$t,useState:$t,useDebugValue:$t,useDeferredValue:$t,useTransition:$t,useMutableSource:$t,useSyncExternalStore:$t,useId:$t,unstable_isNewReconciler:!1},nM={readContext:Hn,useCallback:function(n,e){return si().memoizedState=[n,e===void 0?null:e],n},useContext:Hn,useEffect:lp,useImperativeHandle:function(n,e,t){return t=t!=null?t.concat([n]):null,xl(4194308,4,uv.bind(null,e,n),t)},useLayoutEffect:function(n,e){return xl(4194308,4,n,e)},useInsertionEffect:function(n,e){return xl(4,2,n,e)},useMemo:function(n,e){var t=si();return e=e===void 0?null:e,n=n(),t.memoizedState=[n,e],n},useReducer:function(n,e,t){var i=si();return e=t!==void 0?t(e):e,i.memoizedState=i.baseState=e,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:e},i.queue=n,n=n.dispatch=eM.bind(null,_t,n),[i.memoizedState,n]},useRef:function(n){var e=si();return n={current:n},e.memoizedState=n},useState:ap,useDebugValue:zf,useDeferredValue:function(n){return si().memoizedState=n},useTransition:function(){var n=ap(!1),e=n[0];return n=Qy.bind(null,n[1]),si().memoizedState=n,[e,n]},useMutableSource:function(){},useSyncExternalStore:function(n,e,t){var i=_t,r=si();if(mt){if(t===void 0)throw Error(ue(407));t=t()}else{if(t=e(),Ft===null)throw Error(ue(349));Vr&30||nv(i,e,t)}r.memoizedState=t;var s={value:t,getSnapshot:e};return r.queue=s,lp(rv.bind(null,i,s,n),[n]),i.flags|=2048,ca(9,iv.bind(null,i,s,t,e),void 0,null),t},useId:function(){var n=si(),e=Ft.identifierPrefix;if(mt){var t=Ti,i=wi;t=(i&~(1<<32-Qn(i)-1)).toString(32)+t,e=":"+e+"R"+t,t=aa++,0<t&&(e+="H"+t.toString(32)),e+=":"}else t=Jy++,e=":"+e+"r"+t.toString(32)+":";return n.memoizedState=e},unstable_isNewReconciler:!1},iM={readContext:Hn,useCallback:fv,useContext:Hn,useEffect:kf,useImperativeHandle:dv,useInsertionEffect:lv,useLayoutEffect:cv,useMemo:hv,useReducer:nu,useRef:av,useState:function(){return nu(la)},useDebugValue:zf,useDeferredValue:function(n){var e=Vn();return pv(e,Ct.memoizedState,n)},useTransition:function(){var n=nu(la)[0],e=Vn().memoizedState;return[n,e]},useMutableSource:ev,useSyncExternalStore:tv,useId:mv,unstable_isNewReconciler:!1},rM={readContext:Hn,useCallback:fv,useContext:Hn,useEffect:kf,useImperativeHandle:dv,useInsertionEffect:lv,useLayoutEffect:cv,useMemo:hv,useReducer:iu,useRef:av,useState:function(){return iu(la)},useDebugValue:zf,useDeferredValue:function(n){var e=Vn();return Ct===null?e.memoizedState=n:pv(e,Ct.memoizedState,n)},useTransition:function(){var n=iu(la)[0],e=Vn().memoizedState;return[n,e]},useMutableSource:ev,useSyncExternalStore:tv,useId:mv,unstable_isNewReconciler:!1};function Yn(n,e){if(n&&n.defaultProps){e=xt({},e),n=n.defaultProps;for(var t in n)e[t]===void 0&&(e[t]=n[t]);return e}return e}function Ld(n,e,t,i){e=n.memoizedState,t=t(i,e),t=t==null?e:xt({},e,t),n.memoizedState=t,n.lanes===0&&(n.updateQueue.baseState=t)}var _c={isMounted:function(n){return(n=n._reactInternals)?Xr(n)===n:!1},enqueueSetState:function(n,e,t){n=n._reactInternals;var i=sn(),r=ar(n),s=bi(i,r);s.payload=e,t!=null&&(s.callback=t),e=sr(n,s,r),e!==null&&(ei(e,n,r,i),vl(e,n,r))},enqueueReplaceState:function(n,e,t){n=n._reactInternals;var i=sn(),r=ar(n),s=bi(i,r);s.tag=1,s.payload=e,t!=null&&(s.callback=t),e=sr(n,s,r),e!==null&&(ei(e,n,r,i),vl(e,n,r))},enqueueForceUpdate:function(n,e){n=n._reactInternals;var t=sn(),i=ar(n),r=bi(t,i);r.tag=2,e!=null&&(r.callback=e),e=sr(n,r,i),e!==null&&(ei(e,n,i,t),vl(e,n,i))}};function cp(n,e,t,i,r,s,o){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(i,s,o):e.prototype&&e.prototype.isPureReactComponent?!ta(t,i)||!ta(r,s):!0}function xv(n,e,t){var i=!1,r=fr,s=e.contextType;return typeof s=="object"&&s!==null?s=Hn(s):(r=dn(e)?Br:en.current,i=e.contextTypes,s=(i=i!=null)?Vs(n,r):fr),e=new e(t,s),n.memoizedState=e.state!==null&&e.state!==void 0?e.state:null,e.updater=_c,n.stateNode=e,e._reactInternals=n,i&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=r,n.__reactInternalMemoizedMaskedChildContext=s),e}function up(n,e,t,i){n=e.state,typeof e.componentWillReceiveProps=="function"&&e.componentWillReceiveProps(t,i),typeof e.UNSAFE_componentWillReceiveProps=="function"&&e.UNSAFE_componentWillReceiveProps(t,i),e.state!==n&&_c.enqueueReplaceState(e,e.state,null)}function Id(n,e,t,i){var r=n.stateNode;r.props=t,r.state=n.memoizedState,r.refs={},Nf(n);var s=e.contextType;typeof s=="object"&&s!==null?r.context=Hn(s):(s=dn(e)?Br:en.current,r.context=Vs(n,s)),r.state=n.memoizedState,s=e.getDerivedStateFromProps,typeof s=="function"&&(Ld(n,e,s,t),r.state=n.memoizedState),typeof e.getDerivedStateFromProps=="function"||typeof r.getSnapshotBeforeUpdate=="function"||typeof r.UNSAFE_componentWillMount!="function"&&typeof r.componentWillMount!="function"||(e=r.state,typeof r.componentWillMount=="function"&&r.componentWillMount(),typeof r.UNSAFE_componentWillMount=="function"&&r.UNSAFE_componentWillMount(),e!==r.state&&_c.enqueueReplaceState(r,r.state,null),Vl(n,t,r,i),r.state=n.memoizedState),typeof r.componentDidMount=="function"&&(n.flags|=4194308)}function Xs(n,e){try{var t="",i=e;do t+=Lx(i),i=i.return;while(i);var r=t}catch(s){r=`
Error generating stack: `+s.message+`
`+s.stack}return{value:n,source:e,stack:r,digest:null}}function ru(n,e,t){return{value:n,source:null,stack:t??null,digest:e??null}}function Dd(n,e){try{console.error(e.value)}catch(t){setTimeout(function(){throw t})}}var sM=typeof WeakMap=="function"?WeakMap:Map;function yv(n,e,t){t=bi(-1,t),t.tag=3,t.payload={element:null};var i=e.value;return t.callback=function(){$l||($l=!0,Gd=i),Dd(n,e)},t}function Mv(n,e,t){t=bi(-1,t),t.tag=3;var i=n.type.getDerivedStateFromError;if(typeof i=="function"){var r=e.value;t.payload=function(){return i(r)},t.callback=function(){Dd(n,e)}}var s=n.stateNode;return s!==null&&typeof s.componentDidCatch=="function"&&(t.callback=function(){Dd(n,e),typeof i!="function"&&(or===null?or=new Set([this]):or.add(this));var o=e.stack;this.componentDidCatch(e.value,{componentStack:o!==null?o:""})}),t}function dp(n,e,t){var i=n.pingCache;if(i===null){i=n.pingCache=new sM;var r=new Set;i.set(e,r)}else r=i.get(e),r===void 0&&(r=new Set,i.set(e,r));r.has(t)||(r.add(t),n=xM.bind(null,n,e,t),e.then(n,n))}function fp(n){do{var e;if((e=n.tag===13)&&(e=n.memoizedState,e=e!==null?e.dehydrated!==null:!0),e)return n;n=n.return}while(n!==null);return null}function hp(n,e,t,i,r){return n.mode&1?(n.flags|=65536,n.lanes=r,n):(n===e?n.flags|=65536:(n.flags|=128,t.flags|=131072,t.flags&=-52805,t.tag===1&&(t.alternate===null?t.tag=17:(e=bi(-1,1),e.tag=2,sr(t,e,1))),t.lanes|=1),n)}var oM=Ii.ReactCurrentOwner,cn=!1;function rn(n,e,t,i){e.child=n===null?K0(e,null,t,i):Gs(e,n.child,t,i)}function pp(n,e,t,i,r){t=t.render;var s=e.ref;return Fs(e,r),i=Ff(n,e,t,i,s,r),t=Of(),n!==null&&!cn?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,Li(n,e,r)):(mt&&t&&wf(e),e.flags|=1,rn(n,e,i,r),e.child)}function mp(n,e,t,i,r){if(n===null){var s=t.type;return typeof s=="function"&&!$f(s)&&s.defaultProps===void 0&&t.compare===null&&t.defaultProps===void 0?(e.tag=15,e.type=s,Sv(n,e,s,i,r)):(n=El(t.type,null,i,e,e.mode,r),n.ref=e.ref,n.return=e,e.child=n)}if(s=n.child,!(n.lanes&r)){var o=s.memoizedProps;if(t=t.compare,t=t!==null?t:ta,t(o,i)&&n.ref===e.ref)return Li(n,e,r)}return e.flags|=1,n=lr(s,i),n.ref=e.ref,n.return=e,e.child=n}function Sv(n,e,t,i,r){if(n!==null){var s=n.memoizedProps;if(ta(s,i)&&n.ref===e.ref)if(cn=!1,e.pendingProps=i=s,(n.lanes&r)!==0)n.flags&131072&&(cn=!0);else return e.lanes=n.lanes,Li(n,e,r)}return Ud(n,e,t,i,r)}function Ev(n,e,t){var i=e.pendingProps,r=i.children,s=n!==null?n.memoizedState:null;if(i.mode==="hidden")if(!(e.mode&1))e.memoizedState={baseLanes:0,cachePool:null,transitions:null},ut(Rs,vn),vn|=t;else{if(!(t&1073741824))return n=s!==null?s.baseLanes|t:t,e.lanes=e.childLanes=1073741824,e.memoizedState={baseLanes:n,cachePool:null,transitions:null},e.updateQueue=null,ut(Rs,vn),vn|=n,null;e.memoizedState={baseLanes:0,cachePool:null,transitions:null},i=s!==null?s.baseLanes:t,ut(Rs,vn),vn|=i}else s!==null?(i=s.baseLanes|t,e.memoizedState=null):i=t,ut(Rs,vn),vn|=i;return rn(n,e,r,t),e.child}function wv(n,e){var t=e.ref;(n===null&&t!==null||n!==null&&n.ref!==t)&&(e.flags|=512,e.flags|=2097152)}function Ud(n,e,t,i,r){var s=dn(t)?Br:en.current;return s=Vs(e,s),Fs(e,r),t=Ff(n,e,t,i,s,r),i=Of(),n!==null&&!cn?(e.updateQueue=n.updateQueue,e.flags&=-2053,n.lanes&=~r,Li(n,e,r)):(mt&&i&&wf(e),e.flags|=1,rn(n,e,t,r),e.child)}function gp(n,e,t,i,r){if(dn(t)){var s=!0;Ol(e)}else s=!1;if(Fs(e,r),e.stateNode===null)yl(n,e),xv(e,t,i),Id(e,t,i,r),i=!0;else if(n===null){var o=e.stateNode,a=e.memoizedProps;o.props=a;var l=o.context,c=t.contextType;typeof c=="object"&&c!==null?c=Hn(c):(c=dn(t)?Br:en.current,c=Vs(e,c));var u=t.getDerivedStateFromProps,h=typeof u=="function"||typeof o.getSnapshotBeforeUpdate=="function";h||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==i||l!==c)&&up(e,o,i,c),Xi=!1;var p=e.memoizedState;o.state=p,Vl(e,i,o,r),l=e.memoizedState,a!==i||p!==l||un.current||Xi?(typeof u=="function"&&(Ld(e,t,u,i),l=e.memoizedState),(a=Xi||cp(e,t,a,i,p,l,c))?(h||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(e.flags|=4194308)):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),e.memoizedProps=i,e.memoizedState=l),o.props=i,o.state=l,o.context=c,i=a):(typeof o.componentDidMount=="function"&&(e.flags|=4194308),i=!1)}else{o=e.stateNode,J0(n,e),a=e.memoizedProps,c=e.type===e.elementType?a:Yn(e.type,a),o.props=c,h=e.pendingProps,p=o.context,l=t.contextType,typeof l=="object"&&l!==null?l=Hn(l):(l=dn(t)?Br:en.current,l=Vs(e,l));var f=t.getDerivedStateFromProps;(u=typeof f=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==h||p!==l)&&up(e,o,i,l),Xi=!1,p=e.memoizedState,o.state=p,Vl(e,i,o,r);var g=e.memoizedState;a!==h||p!==g||un.current||Xi?(typeof f=="function"&&(Ld(e,t,f,i),g=e.memoizedState),(c=Xi||cp(e,t,c,i,p,g,l)||!1)?(u||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(i,g,l),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(i,g,l)),typeof o.componentDidUpdate=="function"&&(e.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(e.flags|=1024)):(typeof o.componentDidUpdate!="function"||a===n.memoizedProps&&p===n.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===n.memoizedProps&&p===n.memoizedState||(e.flags|=1024),e.memoizedProps=i,e.memoizedState=g),o.props=i,o.state=g,o.context=l,i=c):(typeof o.componentDidUpdate!="function"||a===n.memoizedProps&&p===n.memoizedState||(e.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===n.memoizedProps&&p===n.memoizedState||(e.flags|=1024),i=!1)}return Fd(n,e,t,i,s,r)}function Fd(n,e,t,i,r,s){wv(n,e);var o=(e.flags&128)!==0;if(!i&&!o)return r&&tp(e,t,!1),Li(n,e,s);i=e.stateNode,oM.current=e;var a=o&&typeof t.getDerivedStateFromError!="function"?null:i.render();return e.flags|=1,n!==null&&o?(e.child=Gs(e,n.child,null,s),e.child=Gs(e,null,a,s)):rn(n,e,a,s),e.memoizedState=i.state,r&&tp(e,t,!0),e.child}function Tv(n){var e=n.stateNode;e.pendingContext?ep(n,e.pendingContext,e.pendingContext!==e.context):e.context&&ep(n,e.context,!1),Lf(n,e.containerInfo)}function vp(n,e,t,i,r){return js(),Af(r),e.flags|=256,rn(n,e,t,i),e.child}var Od={dehydrated:null,treeContext:null,retryLane:0};function kd(n){return{baseLanes:n,cachePool:null,transitions:null}}function Av(n,e,t){var i=e.pendingProps,r=vt.current,s=!1,o=(e.flags&128)!==0,a;if((a=o)||(a=n!==null&&n.memoizedState===null?!1:(r&2)!==0),a?(s=!0,e.flags&=-129):(n===null||n.memoizedState!==null)&&(r|=1),ut(vt,r&1),n===null)return Pd(e),n=e.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?(e.mode&1?n.data==="$!"?e.lanes=8:e.lanes=1073741824:e.lanes=1,null):(o=i.children,n=i.fallback,s?(i=e.mode,s=e.child,o={mode:"hidden",children:o},!(i&1)&&s!==null?(s.childLanes=0,s.pendingProps=o):s=Mc(o,i,0,null),n=zr(n,i,t,null),s.return=e,n.return=e,s.sibling=n,e.child=s,e.child.memoizedState=kd(t),e.memoizedState=Od,n):Bf(e,o));if(r=n.memoizedState,r!==null&&(a=r.dehydrated,a!==null))return aM(n,e,o,i,a,r,t);if(s){s=i.fallback,o=e.mode,r=n.child,a=r.sibling;var l={mode:"hidden",children:i.children};return!(o&1)&&e.child!==r?(i=e.child,i.childLanes=0,i.pendingProps=l,e.deletions=null):(i=lr(r,l),i.subtreeFlags=r.subtreeFlags&14680064),a!==null?s=lr(a,s):(s=zr(s,o,t,null),s.flags|=2),s.return=e,i.return=e,i.sibling=s,e.child=i,i=s,s=e.child,o=n.child.memoizedState,o=o===null?kd(t):{baseLanes:o.baseLanes|t,cachePool:null,transitions:o.transitions},s.memoizedState=o,s.childLanes=n.childLanes&~t,e.memoizedState=Od,i}return s=n.child,n=s.sibling,i=lr(s,{mode:"visible",children:i.children}),!(e.mode&1)&&(i.lanes=t),i.return=e,i.sibling=null,n!==null&&(t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)),e.child=i,e.memoizedState=null,i}function Bf(n,e){return e=Mc({mode:"visible",children:e},n.mode,0,null),e.return=n,n.child=e}function Fa(n,e,t,i){return i!==null&&Af(i),Gs(e,n.child,null,t),n=Bf(e,e.pendingProps.children),n.flags|=2,e.memoizedState=null,n}function aM(n,e,t,i,r,s,o){if(t)return e.flags&256?(e.flags&=-257,i=ru(Error(ue(422))),Fa(n,e,o,i)):e.memoizedState!==null?(e.child=n.child,e.flags|=128,null):(s=i.fallback,r=e.mode,i=Mc({mode:"visible",children:i.children},r,0,null),s=zr(s,r,o,null),s.flags|=2,i.return=e,s.return=e,i.sibling=s,e.child=i,e.mode&1&&Gs(e,n.child,null,o),e.child.memoizedState=kd(o),e.memoizedState=Od,s);if(!(e.mode&1))return Fa(n,e,o,null);if(r.data==="$!"){if(i=r.nextSibling&&r.nextSibling.dataset,i)var a=i.dgst;return i=a,s=Error(ue(419)),i=ru(s,i,void 0),Fa(n,e,o,i)}if(a=(o&n.childLanes)!==0,cn||a){if(i=Ft,i!==null){switch(o&-o){case 4:r=2;break;case 16:r=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:r=32;break;case 536870912:r=268435456;break;default:r=0}r=r&(i.suspendedLanes|o)?0:r,r!==0&&r!==s.retryLane&&(s.retryLane=r,Ni(n,r),ei(i,n,r,-1))}return Xf(),i=ru(Error(ue(421))),Fa(n,e,o,i)}return r.data==="$?"?(e.flags|=128,e.child=n.child,e=yM.bind(null,n),r._reactRetry=e,null):(n=s.treeContext,Mn=rr(r.nextSibling),wn=e,mt=!0,Kn=null,n!==null&&(Ln[In++]=wi,Ln[In++]=Ti,Ln[In++]=Hr,wi=n.id,Ti=n.overflow,Hr=e),e=Bf(e,i.children),e.flags|=4096,e)}function _p(n,e,t){n.lanes|=e;var i=n.alternate;i!==null&&(i.lanes|=e),Nd(n.return,e,t)}function su(n,e,t,i,r){var s=n.memoizedState;s===null?n.memoizedState={isBackwards:e,rendering:null,renderingStartTime:0,last:i,tail:t,tailMode:r}:(s.isBackwards=e,s.rendering=null,s.renderingStartTime=0,s.last=i,s.tail=t,s.tailMode=r)}function bv(n,e,t){var i=e.pendingProps,r=i.revealOrder,s=i.tail;if(rn(n,e,i.children,t),i=vt.current,i&2)i=i&1|2,e.flags|=128;else{if(n!==null&&n.flags&128)e:for(n=e.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&_p(n,t,e);else if(n.tag===19)_p(n,t,e);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break e;for(;n.sibling===null;){if(n.return===null||n.return===e)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}i&=1}if(ut(vt,i),!(e.mode&1))e.memoizedState=null;else switch(r){case"forwards":for(t=e.child,r=null;t!==null;)n=t.alternate,n!==null&&jl(n)===null&&(r=t),t=t.sibling;t=r,t===null?(r=e.child,e.child=null):(r=t.sibling,t.sibling=null),su(e,!1,r,t,s);break;case"backwards":for(t=null,r=e.child,e.child=null;r!==null;){if(n=r.alternate,n!==null&&jl(n)===null){e.child=r;break}n=r.sibling,r.sibling=t,t=r,r=n}su(e,!0,t,null,s);break;case"together":su(e,!1,null,null,void 0);break;default:e.memoizedState=null}return e.child}function yl(n,e){!(e.mode&1)&&n!==null&&(n.alternate=null,e.alternate=null,e.flags|=2)}function Li(n,e,t){if(n!==null&&(e.dependencies=n.dependencies),jr|=e.lanes,!(t&e.childLanes))return null;if(n!==null&&e.child!==n.child)throw Error(ue(153));if(e.child!==null){for(n=e.child,t=lr(n,n.pendingProps),e.child=t,t.return=e;n.sibling!==null;)n=n.sibling,t=t.sibling=lr(n,n.pendingProps),t.return=e;t.sibling=null}return e.child}function lM(n,e,t){switch(e.tag){case 3:Tv(e),js();break;case 5:Q0(e);break;case 1:dn(e.type)&&Ol(e);break;case 4:Lf(e,e.stateNode.containerInfo);break;case 10:var i=e.type._context,r=e.memoizedProps.value;ut(Bl,i._currentValue),i._currentValue=r;break;case 13:if(i=e.memoizedState,i!==null)return i.dehydrated!==null?(ut(vt,vt.current&1),e.flags|=128,null):t&e.child.childLanes?Av(n,e,t):(ut(vt,vt.current&1),n=Li(n,e,t),n!==null?n.sibling:null);ut(vt,vt.current&1);break;case 19:if(i=(t&e.childLanes)!==0,n.flags&128){if(i)return bv(n,e,t);e.flags|=128}if(r=e.memoizedState,r!==null&&(r.rendering=null,r.tail=null,r.lastEffect=null),ut(vt,vt.current),i)break;return null;case 22:case 23:return e.lanes=0,Ev(n,e,t)}return Li(n,e,t)}var Cv,zd,Rv,Pv;Cv=function(n,e){for(var t=e.child;t!==null;){if(t.tag===5||t.tag===6)n.appendChild(t.stateNode);else if(t.tag!==4&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return;t=t.return}t.sibling.return=t.return,t=t.sibling}};zd=function(){};Rv=function(n,e,t,i){var r=n.memoizedProps;if(r!==i){n=e.stateNode,Fr(ui.current);var s=null;switch(t){case"input":r=ad(n,r),i=ad(n,i),s=[];break;case"select":r=xt({},r,{value:void 0}),i=xt({},i,{value:void 0}),s=[];break;case"textarea":r=ud(n,r),i=ud(n,i),s=[];break;default:typeof r.onClick!="function"&&typeof i.onClick=="function"&&(n.onclick=Ul)}fd(t,i);var o;t=null;for(c in r)if(!i.hasOwnProperty(c)&&r.hasOwnProperty(c)&&r[c]!=null)if(c==="style"){var a=r[c];for(o in a)a.hasOwnProperty(o)&&(t||(t={}),t[o]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Yo.hasOwnProperty(c)?s||(s=[]):(s=s||[]).push(c,null));for(c in i){var l=i[c];if(a=r!=null?r[c]:void 0,i.hasOwnProperty(c)&&l!==a&&(l!=null||a!=null))if(c==="style")if(a){for(o in a)!a.hasOwnProperty(o)||l&&l.hasOwnProperty(o)||(t||(t={}),t[o]="");for(o in l)l.hasOwnProperty(o)&&a[o]!==l[o]&&(t||(t={}),t[o]=l[o])}else t||(s||(s=[]),s.push(c,t)),t=l;else c==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,a=a?a.__html:void 0,l!=null&&a!==l&&(s=s||[]).push(c,l)):c==="children"?typeof l!="string"&&typeof l!="number"||(s=s||[]).push(c,""+l):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Yo.hasOwnProperty(c)?(l!=null&&c==="onScroll"&&ft("scroll",n),s||a===l||(s=[])):(s=s||[]).push(c,l))}t&&(s=s||[]).push("style",t);var c=s;(e.updateQueue=c)&&(e.flags|=4)}};Pv=function(n,e,t,i){t!==i&&(e.flags|=4)};function _o(n,e){if(!mt)switch(n.tailMode){case"hidden":e=n.tail;for(var t=null;e!==null;)e.alternate!==null&&(t=e),e=e.sibling;t===null?n.tail=null:t.sibling=null;break;case"collapsed":t=n.tail;for(var i=null;t!==null;)t.alternate!==null&&(i=t),t=t.sibling;i===null?e||n.tail===null?n.tail=null:n.tail.sibling=null:i.sibling=null}}function Yt(n){var e=n.alternate!==null&&n.alternate.child===n.child,t=0,i=0;if(e)for(var r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags&14680064,i|=r.flags&14680064,r.return=n,r=r.sibling;else for(r=n.child;r!==null;)t|=r.lanes|r.childLanes,i|=r.subtreeFlags,i|=r.flags,r.return=n,r=r.sibling;return n.subtreeFlags|=i,n.childLanes=t,e}function cM(n,e,t){var i=e.pendingProps;switch(Tf(e),e.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Yt(e),null;case 1:return dn(e.type)&&Fl(),Yt(e),null;case 3:return i=e.stateNode,Ws(),ht(un),ht(en),Df(),i.pendingContext&&(i.context=i.pendingContext,i.pendingContext=null),(n===null||n.child===null)&&(Da(e)?e.flags|=4:n===null||n.memoizedState.isDehydrated&&!(e.flags&256)||(e.flags|=1024,Kn!==null&&($d(Kn),Kn=null))),zd(n,e),Yt(e),null;case 5:If(e);var r=Fr(oa.current);if(t=e.type,n!==null&&e.stateNode!=null)Rv(n,e,t,i,r),n.ref!==e.ref&&(e.flags|=512,e.flags|=2097152);else{if(!i){if(e.stateNode===null)throw Error(ue(166));return Yt(e),null}if(n=Fr(ui.current),Da(e)){i=e.stateNode,t=e.type;var s=e.memoizedProps;switch(i[ai]=e,i[ra]=s,n=(e.mode&1)!==0,t){case"dialog":ft("cancel",i),ft("close",i);break;case"iframe":case"object":case"embed":ft("load",i);break;case"video":case"audio":for(r=0;r<No.length;r++)ft(No[r],i);break;case"source":ft("error",i);break;case"img":case"image":case"link":ft("error",i),ft("load",i);break;case"details":ft("toggle",i);break;case"input":bh(i,s),ft("invalid",i);break;case"select":i._wrapperState={wasMultiple:!!s.multiple},ft("invalid",i);break;case"textarea":Rh(i,s),ft("invalid",i)}fd(t,s),r=null;for(var o in s)if(s.hasOwnProperty(o)){var a=s[o];o==="children"?typeof a=="string"?i.textContent!==a&&(s.suppressHydrationWarning!==!0&&Ia(i.textContent,a,n),r=["children",a]):typeof a=="number"&&i.textContent!==""+a&&(s.suppressHydrationWarning!==!0&&Ia(i.textContent,a,n),r=["children",""+a]):Yo.hasOwnProperty(o)&&a!=null&&o==="onScroll"&&ft("scroll",i)}switch(t){case"input":Ta(i),Ch(i,s,!0);break;case"textarea":Ta(i),Ph(i);break;case"select":case"option":break;default:typeof s.onClick=="function"&&(i.onclick=Ul)}i=r,e.updateQueue=i,i!==null&&(e.flags|=4)}else{o=r.nodeType===9?r:r.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=r0(t)),n==="http://www.w3.org/1999/xhtml"?t==="script"?(n=o.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof i.is=="string"?n=o.createElement(t,{is:i.is}):(n=o.createElement(t),t==="select"&&(o=n,i.multiple?o.multiple=!0:i.size&&(o.size=i.size))):n=o.createElementNS(n,t),n[ai]=e,n[ra]=i,Cv(n,e,!1,!1),e.stateNode=n;e:{switch(o=hd(t,i),t){case"dialog":ft("cancel",n),ft("close",n),r=i;break;case"iframe":case"object":case"embed":ft("load",n),r=i;break;case"video":case"audio":for(r=0;r<No.length;r++)ft(No[r],n);r=i;break;case"source":ft("error",n),r=i;break;case"img":case"image":case"link":ft("error",n),ft("load",n),r=i;break;case"details":ft("toggle",n),r=i;break;case"input":bh(n,i),r=ad(n,i),ft("invalid",n);break;case"option":r=i;break;case"select":n._wrapperState={wasMultiple:!!i.multiple},r=xt({},i,{value:void 0}),ft("invalid",n);break;case"textarea":Rh(n,i),r=ud(n,i),ft("invalid",n);break;default:r=i}fd(t,r),a=r;for(s in a)if(a.hasOwnProperty(s)){var l=a[s];s==="style"?a0(n,l):s==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,l!=null&&s0(n,l)):s==="children"?typeof l=="string"?(t!=="textarea"||l!=="")&&qo(n,l):typeof l=="number"&&qo(n,""+l):s!=="suppressContentEditableWarning"&&s!=="suppressHydrationWarning"&&s!=="autoFocus"&&(Yo.hasOwnProperty(s)?l!=null&&s==="onScroll"&&ft("scroll",n):l!=null&&uf(n,s,l,o))}switch(t){case"input":Ta(n),Ch(n,i,!1);break;case"textarea":Ta(n),Ph(n);break;case"option":i.value!=null&&n.setAttribute("value",""+dr(i.value));break;case"select":n.multiple=!!i.multiple,s=i.value,s!=null?Ls(n,!!i.multiple,s,!1):i.defaultValue!=null&&Ls(n,!!i.multiple,i.defaultValue,!0);break;default:typeof r.onClick=="function"&&(n.onclick=Ul)}switch(t){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break e;case"img":i=!0;break e;default:i=!1}}i&&(e.flags|=4)}e.ref!==null&&(e.flags|=512,e.flags|=2097152)}return Yt(e),null;case 6:if(n&&e.stateNode!=null)Pv(n,e,n.memoizedProps,i);else{if(typeof i!="string"&&e.stateNode===null)throw Error(ue(166));if(t=Fr(oa.current),Fr(ui.current),Da(e)){if(i=e.stateNode,t=e.memoizedProps,i[ai]=e,(s=i.nodeValue!==t)&&(n=wn,n!==null))switch(n.tag){case 3:Ia(i.nodeValue,t,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Ia(i.nodeValue,t,(n.mode&1)!==0)}s&&(e.flags|=4)}else i=(t.nodeType===9?t:t.ownerDocument).createTextNode(i),i[ai]=e,e.stateNode=i}return Yt(e),null;case 13:if(ht(vt),i=e.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(mt&&Mn!==null&&e.mode&1&&!(e.flags&128))Y0(),js(),e.flags|=98560,s=!1;else if(s=Da(e),i!==null&&i.dehydrated!==null){if(n===null){if(!s)throw Error(ue(318));if(s=e.memoizedState,s=s!==null?s.dehydrated:null,!s)throw Error(ue(317));s[ai]=e}else js(),!(e.flags&128)&&(e.memoizedState=null),e.flags|=4;Yt(e),s=!1}else Kn!==null&&($d(Kn),Kn=null),s=!0;if(!s)return e.flags&65536?e:null}return e.flags&128?(e.lanes=t,e):(i=i!==null,i!==(n!==null&&n.memoizedState!==null)&&i&&(e.child.flags|=8192,e.mode&1&&(n===null||vt.current&1?Rt===0&&(Rt=3):Xf())),e.updateQueue!==null&&(e.flags|=4),Yt(e),null);case 4:return Ws(),zd(n,e),n===null&&na(e.stateNode.containerInfo),Yt(e),null;case 10:return Rf(e.type._context),Yt(e),null;case 17:return dn(e.type)&&Fl(),Yt(e),null;case 19:if(ht(vt),s=e.memoizedState,s===null)return Yt(e),null;if(i=(e.flags&128)!==0,o=s.rendering,o===null)if(i)_o(s,!1);else{if(Rt!==0||n!==null&&n.flags&128)for(n=e.child;n!==null;){if(o=jl(n),o!==null){for(e.flags|=128,_o(s,!1),i=o.updateQueue,i!==null&&(e.updateQueue=i,e.flags|=4),e.subtreeFlags=0,i=t,t=e.child;t!==null;)s=t,n=i,s.flags&=14680066,o=s.alternate,o===null?(s.childLanes=0,s.lanes=n,s.child=null,s.subtreeFlags=0,s.memoizedProps=null,s.memoizedState=null,s.updateQueue=null,s.dependencies=null,s.stateNode=null):(s.childLanes=o.childLanes,s.lanes=o.lanes,s.child=o.child,s.subtreeFlags=0,s.deletions=null,s.memoizedProps=o.memoizedProps,s.memoizedState=o.memoizedState,s.updateQueue=o.updateQueue,s.type=o.type,n=o.dependencies,s.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),t=t.sibling;return ut(vt,vt.current&1|2),e.child}n=n.sibling}s.tail!==null&&St()>$s&&(e.flags|=128,i=!0,_o(s,!1),e.lanes=4194304)}else{if(!i)if(n=jl(o),n!==null){if(e.flags|=128,i=!0,t=n.updateQueue,t!==null&&(e.updateQueue=t,e.flags|=4),_o(s,!0),s.tail===null&&s.tailMode==="hidden"&&!o.alternate&&!mt)return Yt(e),null}else 2*St()-s.renderingStartTime>$s&&t!==1073741824&&(e.flags|=128,i=!0,_o(s,!1),e.lanes=4194304);s.isBackwards?(o.sibling=e.child,e.child=o):(t=s.last,t!==null?t.sibling=o:e.child=o,s.last=o)}return s.tail!==null?(e=s.tail,s.rendering=e,s.tail=e.sibling,s.renderingStartTime=St(),e.sibling=null,t=vt.current,ut(vt,i?t&1|2:t&1),e):(Yt(e),null);case 22:case 23:return Wf(),i=e.memoizedState!==null,n!==null&&n.memoizedState!==null!==i&&(e.flags|=8192),i&&e.mode&1?vn&1073741824&&(Yt(e),e.subtreeFlags&6&&(e.flags|=8192)):Yt(e),null;case 24:return null;case 25:return null}throw Error(ue(156,e.tag))}function uM(n,e){switch(Tf(e),e.tag){case 1:return dn(e.type)&&Fl(),n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 3:return Ws(),ht(un),ht(en),Df(),n=e.flags,n&65536&&!(n&128)?(e.flags=n&-65537|128,e):null;case 5:return If(e),null;case 13:if(ht(vt),n=e.memoizedState,n!==null&&n.dehydrated!==null){if(e.alternate===null)throw Error(ue(340));js()}return n=e.flags,n&65536?(e.flags=n&-65537|128,e):null;case 19:return ht(vt),null;case 4:return Ws(),null;case 10:return Rf(e.type._context),null;case 22:case 23:return Wf(),null;case 24:return null;default:return null}}var Oa=!1,Zt=!1,dM=typeof WeakSet=="function"?WeakSet:Set,ye=null;function Cs(n,e){var t=n.ref;if(t!==null)if(typeof t=="function")try{t(null)}catch(i){Mt(n,e,i)}else t.current=null}function Bd(n,e,t){try{t()}catch(i){Mt(n,e,i)}}var xp=!1;function fM(n,e){if(Ed=Ll,n=U0(),Ef(n)){if("selectionStart"in n)var t={start:n.selectionStart,end:n.selectionEnd};else e:{t=(t=n.ownerDocument)&&t.defaultView||window;var i=t.getSelection&&t.getSelection();if(i&&i.rangeCount!==0){t=i.anchorNode;var r=i.anchorOffset,s=i.focusNode;i=i.focusOffset;try{t.nodeType,s.nodeType}catch{t=null;break e}var o=0,a=-1,l=-1,c=0,u=0,h=n,p=null;t:for(;;){for(var f;h!==t||r!==0&&h.nodeType!==3||(a=o+r),h!==s||i!==0&&h.nodeType!==3||(l=o+i),h.nodeType===3&&(o+=h.nodeValue.length),(f=h.firstChild)!==null;)p=h,h=f;for(;;){if(h===n)break t;if(p===t&&++c===r&&(a=o),p===s&&++u===i&&(l=o),(f=h.nextSibling)!==null)break;h=p,p=h.parentNode}h=f}t=a===-1||l===-1?null:{start:a,end:l}}else t=null}t=t||{start:0,end:0}}else t=null;for(wd={focusedElem:n,selectionRange:t},Ll=!1,ye=e;ye!==null;)if(e=ye,n=e.child,(e.subtreeFlags&1028)!==0&&n!==null)n.return=e,ye=n;else for(;ye!==null;){e=ye;try{var g=e.alternate;if(e.flags&1024)switch(e.tag){case 0:case 11:case 15:break;case 1:if(g!==null){var y=g.memoizedProps,m=g.memoizedState,d=e.stateNode,v=d.getSnapshotBeforeUpdate(e.elementType===e.type?y:Yn(e.type,y),m);d.__reactInternalSnapshotBeforeUpdate=v}break;case 3:var _=e.stateNode.containerInfo;_.nodeType===1?_.textContent="":_.nodeType===9&&_.documentElement&&_.removeChild(_.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(ue(163))}}catch(M){Mt(e,e.return,M)}if(n=e.sibling,n!==null){n.return=e.return,ye=n;break}ye=e.return}return g=xp,xp=!1,g}function Ho(n,e,t){var i=e.updateQueue;if(i=i!==null?i.lastEffect:null,i!==null){var r=i=i.next;do{if((r.tag&n)===n){var s=r.destroy;r.destroy=void 0,s!==void 0&&Bd(e,t,s)}r=r.next}while(r!==i)}}function xc(n,e){if(e=e.updateQueue,e=e!==null?e.lastEffect:null,e!==null){var t=e=e.next;do{if((t.tag&n)===n){var i=t.create;t.destroy=i()}t=t.next}while(t!==e)}}function Hd(n){var e=n.ref;if(e!==null){var t=n.stateNode;switch(n.tag){case 5:n=t;break;default:n=t}typeof e=="function"?e(n):e.current=n}}function Nv(n){var e=n.alternate;e!==null&&(n.alternate=null,Nv(e)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(e=n.stateNode,e!==null&&(delete e[ai],delete e[ra],delete e[bd],delete e[Yy],delete e[qy])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function Lv(n){return n.tag===5||n.tag===3||n.tag===4}function yp(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||Lv(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Vd(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.nodeType===8?t.parentNode.insertBefore(n,e):t.insertBefore(n,e):(t.nodeType===8?(e=t.parentNode,e.insertBefore(n,t)):(e=t,e.appendChild(n)),t=t._reactRootContainer,t!=null||e.onclick!==null||(e.onclick=Ul));else if(i!==4&&(n=n.child,n!==null))for(Vd(n,e,t),n=n.sibling;n!==null;)Vd(n,e,t),n=n.sibling}function jd(n,e,t){var i=n.tag;if(i===5||i===6)n=n.stateNode,e?t.insertBefore(n,e):t.appendChild(n);else if(i!==4&&(n=n.child,n!==null))for(jd(n,e,t),n=n.sibling;n!==null;)jd(n,e,t),n=n.sibling}var zt=null,qn=!1;function Oi(n,e,t){for(t=t.child;t!==null;)Iv(n,e,t),t=t.sibling}function Iv(n,e,t){if(ci&&typeof ci.onCommitFiberUnmount=="function")try{ci.onCommitFiberUnmount(dc,t)}catch{}switch(t.tag){case 5:Zt||Cs(t,e);case 6:var i=zt,r=qn;zt=null,Oi(n,e,t),zt=i,qn=r,zt!==null&&(qn?(n=zt,t=t.stateNode,n.nodeType===8?n.parentNode.removeChild(t):n.removeChild(t)):zt.removeChild(t.stateNode));break;case 18:zt!==null&&(qn?(n=zt,t=t.stateNode,n.nodeType===8?Jc(n.parentNode,t):n.nodeType===1&&Jc(n,t),Qo(n)):Jc(zt,t.stateNode));break;case 4:i=zt,r=qn,zt=t.stateNode.containerInfo,qn=!0,Oi(n,e,t),zt=i,qn=r;break;case 0:case 11:case 14:case 15:if(!Zt&&(i=t.updateQueue,i!==null&&(i=i.lastEffect,i!==null))){r=i=i.next;do{var s=r,o=s.destroy;s=s.tag,o!==void 0&&(s&2||s&4)&&Bd(t,e,o),r=r.next}while(r!==i)}Oi(n,e,t);break;case 1:if(!Zt&&(Cs(t,e),i=t.stateNode,typeof i.componentWillUnmount=="function"))try{i.props=t.memoizedProps,i.state=t.memoizedState,i.componentWillUnmount()}catch(a){Mt(t,e,a)}Oi(n,e,t);break;case 21:Oi(n,e,t);break;case 22:t.mode&1?(Zt=(i=Zt)||t.memoizedState!==null,Oi(n,e,t),Zt=i):Oi(n,e,t);break;default:Oi(n,e,t)}}function Mp(n){var e=n.updateQueue;if(e!==null){n.updateQueue=null;var t=n.stateNode;t===null&&(t=n.stateNode=new dM),e.forEach(function(i){var r=MM.bind(null,n,i);t.has(i)||(t.add(i),i.then(r,r))})}}function jn(n,e){var t=e.deletions;if(t!==null)for(var i=0;i<t.length;i++){var r=t[i];try{var s=n,o=e,a=o;e:for(;a!==null;){switch(a.tag){case 5:zt=a.stateNode,qn=!1;break e;case 3:zt=a.stateNode.containerInfo,qn=!0;break e;case 4:zt=a.stateNode.containerInfo,qn=!0;break e}a=a.return}if(zt===null)throw Error(ue(160));Iv(s,o,r),zt=null,qn=!1;var l=r.alternate;l!==null&&(l.return=null),r.return=null}catch(c){Mt(r,e,c)}}if(e.subtreeFlags&12854)for(e=e.child;e!==null;)Dv(e,n),e=e.sibling}function Dv(n,e){var t=n.alternate,i=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(jn(e,n),ri(n),i&4){try{Ho(3,n,n.return),xc(3,n)}catch(y){Mt(n,n.return,y)}try{Ho(5,n,n.return)}catch(y){Mt(n,n.return,y)}}break;case 1:jn(e,n),ri(n),i&512&&t!==null&&Cs(t,t.return);break;case 5:if(jn(e,n),ri(n),i&512&&t!==null&&Cs(t,t.return),n.flags&32){var r=n.stateNode;try{qo(r,"")}catch(y){Mt(n,n.return,y)}}if(i&4&&(r=n.stateNode,r!=null)){var s=n.memoizedProps,o=t!==null?t.memoizedProps:s,a=n.type,l=n.updateQueue;if(n.updateQueue=null,l!==null)try{a==="input"&&s.type==="radio"&&s.name!=null&&n0(r,s),hd(a,o);var c=hd(a,s);for(o=0;o<l.length;o+=2){var u=l[o],h=l[o+1];u==="style"?a0(r,h):u==="dangerouslySetInnerHTML"?s0(r,h):u==="children"?qo(r,h):uf(r,u,h,c)}switch(a){case"input":ld(r,s);break;case"textarea":i0(r,s);break;case"select":var p=r._wrapperState.wasMultiple;r._wrapperState.wasMultiple=!!s.multiple;var f=s.value;f!=null?Ls(r,!!s.multiple,f,!1):p!==!!s.multiple&&(s.defaultValue!=null?Ls(r,!!s.multiple,s.defaultValue,!0):Ls(r,!!s.multiple,s.multiple?[]:"",!1))}r[ra]=s}catch(y){Mt(n,n.return,y)}}break;case 6:if(jn(e,n),ri(n),i&4){if(n.stateNode===null)throw Error(ue(162));r=n.stateNode,s=n.memoizedProps;try{r.nodeValue=s}catch(y){Mt(n,n.return,y)}}break;case 3:if(jn(e,n),ri(n),i&4&&t!==null&&t.memoizedState.isDehydrated)try{Qo(e.containerInfo)}catch(y){Mt(n,n.return,y)}break;case 4:jn(e,n),ri(n);break;case 13:jn(e,n),ri(n),r=n.child,r.flags&8192&&(s=r.memoizedState!==null,r.stateNode.isHidden=s,!s||r.alternate!==null&&r.alternate.memoizedState!==null||(jf=St())),i&4&&Mp(n);break;case 22:if(u=t!==null&&t.memoizedState!==null,n.mode&1?(Zt=(c=Zt)||u,jn(e,n),Zt=c):jn(e,n),ri(n),i&8192){if(c=n.memoizedState!==null,(n.stateNode.isHidden=c)&&!u&&n.mode&1)for(ye=n,u=n.child;u!==null;){for(h=ye=u;ye!==null;){switch(p=ye,f=p.child,p.tag){case 0:case 11:case 14:case 15:Ho(4,p,p.return);break;case 1:Cs(p,p.return);var g=p.stateNode;if(typeof g.componentWillUnmount=="function"){i=p,t=p.return;try{e=i,g.props=e.memoizedProps,g.state=e.memoizedState,g.componentWillUnmount()}catch(y){Mt(i,t,y)}}break;case 5:Cs(p,p.return);break;case 22:if(p.memoizedState!==null){Ep(h);continue}}f!==null?(f.return=p,ye=f):Ep(h)}u=u.sibling}e:for(u=null,h=n;;){if(h.tag===5){if(u===null){u=h;try{r=h.stateNode,c?(s=r.style,typeof s.setProperty=="function"?s.setProperty("display","none","important"):s.display="none"):(a=h.stateNode,l=h.memoizedProps.style,o=l!=null&&l.hasOwnProperty("display")?l.display:null,a.style.display=o0("display",o))}catch(y){Mt(n,n.return,y)}}}else if(h.tag===6){if(u===null)try{h.stateNode.nodeValue=c?"":h.memoizedProps}catch(y){Mt(n,n.return,y)}}else if((h.tag!==22&&h.tag!==23||h.memoizedState===null||h===n)&&h.child!==null){h.child.return=h,h=h.child;continue}if(h===n)break e;for(;h.sibling===null;){if(h.return===null||h.return===n)break e;u===h&&(u=null),h=h.return}u===h&&(u=null),h.sibling.return=h.return,h=h.sibling}}break;case 19:jn(e,n),ri(n),i&4&&Mp(n);break;case 21:break;default:jn(e,n),ri(n)}}function ri(n){var e=n.flags;if(e&2){try{e:{for(var t=n.return;t!==null;){if(Lv(t)){var i=t;break e}t=t.return}throw Error(ue(160))}switch(i.tag){case 5:var r=i.stateNode;i.flags&32&&(qo(r,""),i.flags&=-33);var s=yp(n);jd(n,s,r);break;case 3:case 4:var o=i.stateNode.containerInfo,a=yp(n);Vd(n,a,o);break;default:throw Error(ue(161))}}catch(l){Mt(n,n.return,l)}n.flags&=-3}e&4096&&(n.flags&=-4097)}function hM(n,e,t){ye=n,Uv(n)}function Uv(n,e,t){for(var i=(n.mode&1)!==0;ye!==null;){var r=ye,s=r.child;if(r.tag===22&&i){var o=r.memoizedState!==null||Oa;if(!o){var a=r.alternate,l=a!==null&&a.memoizedState!==null||Zt;a=Oa;var c=Zt;if(Oa=o,(Zt=l)&&!c)for(ye=r;ye!==null;)o=ye,l=o.child,o.tag===22&&o.memoizedState!==null?wp(r):l!==null?(l.return=o,ye=l):wp(r);for(;s!==null;)ye=s,Uv(s),s=s.sibling;ye=r,Oa=a,Zt=c}Sp(n)}else r.subtreeFlags&8772&&s!==null?(s.return=r,ye=s):Sp(n)}}function Sp(n){for(;ye!==null;){var e=ye;if(e.flags&8772){var t=e.alternate;try{if(e.flags&8772)switch(e.tag){case 0:case 11:case 15:Zt||xc(5,e);break;case 1:var i=e.stateNode;if(e.flags&4&&!Zt)if(t===null)i.componentDidMount();else{var r=e.elementType===e.type?t.memoizedProps:Yn(e.type,t.memoizedProps);i.componentDidUpdate(r,t.memoizedState,i.__reactInternalSnapshotBeforeUpdate)}var s=e.updateQueue;s!==null&&op(e,s,i);break;case 3:var o=e.updateQueue;if(o!==null){if(t=null,e.child!==null)switch(e.child.tag){case 5:t=e.child.stateNode;break;case 1:t=e.child.stateNode}op(e,o,t)}break;case 5:var a=e.stateNode;if(t===null&&e.flags&4){t=a;var l=e.memoizedProps;switch(e.type){case"button":case"input":case"select":case"textarea":l.autoFocus&&t.focus();break;case"img":l.src&&(t.src=l.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(e.memoizedState===null){var c=e.alternate;if(c!==null){var u=c.memoizedState;if(u!==null){var h=u.dehydrated;h!==null&&Qo(h)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(ue(163))}Zt||e.flags&512&&Hd(e)}catch(p){Mt(e,e.return,p)}}if(e===n){ye=null;break}if(t=e.sibling,t!==null){t.return=e.return,ye=t;break}ye=e.return}}function Ep(n){for(;ye!==null;){var e=ye;if(e===n){ye=null;break}var t=e.sibling;if(t!==null){t.return=e.return,ye=t;break}ye=e.return}}function wp(n){for(;ye!==null;){var e=ye;try{switch(e.tag){case 0:case 11:case 15:var t=e.return;try{xc(4,e)}catch(l){Mt(e,t,l)}break;case 1:var i=e.stateNode;if(typeof i.componentDidMount=="function"){var r=e.return;try{i.componentDidMount()}catch(l){Mt(e,r,l)}}var s=e.return;try{Hd(e)}catch(l){Mt(e,s,l)}break;case 5:var o=e.return;try{Hd(e)}catch(l){Mt(e,o,l)}}}catch(l){Mt(e,e.return,l)}if(e===n){ye=null;break}var a=e.sibling;if(a!==null){a.return=e.return,ye=a;break}ye=e.return}}var pM=Math.ceil,Xl=Ii.ReactCurrentDispatcher,Hf=Ii.ReactCurrentOwner,kn=Ii.ReactCurrentBatchConfig,Je=0,Ft=null,bt=null,jt=0,vn=0,Rs=_r(0),Rt=0,ua=null,jr=0,yc=0,Vf=0,Vo=null,ln=null,jf=0,$s=1/0,Mi=null,$l=!1,Gd=null,or=null,ka=!1,Zi=null,Yl=0,jo=0,Wd=null,Ml=-1,Sl=0;function sn(){return Je&6?St():Ml!==-1?Ml:Ml=St()}function ar(n){return n.mode&1?Je&2&&jt!==0?jt&-jt:Zy.transition!==null?(Sl===0&&(Sl=x0()),Sl):(n=ot,n!==0||(n=window.event,n=n===void 0?16:A0(n.type)),n):1}function ei(n,e,t,i){if(50<jo)throw jo=0,Wd=null,Error(ue(185));ga(n,t,i),(!(Je&2)||n!==Ft)&&(n===Ft&&(!(Je&2)&&(yc|=t),Rt===4&&qi(n,jt)),fn(n,i),t===1&&Je===0&&!(e.mode&1)&&($s=St()+500,gc&&xr()))}function fn(n,e){var t=n.callbackNode;Zx(n,e);var i=Nl(n,n===Ft?jt:0);if(i===0)t!==null&&Ih(t),n.callbackNode=null,n.callbackPriority=0;else if(e=i&-i,n.callbackPriority!==e){if(t!=null&&Ih(t),e===1)n.tag===0?Ky(Tp.bind(null,n)):W0(Tp.bind(null,n)),Xy(function(){!(Je&6)&&xr()}),t=null;else{switch(y0(i)){case 1:t=mf;break;case 4:t=v0;break;case 16:t=Pl;break;case 536870912:t=_0;break;default:t=Pl}t=jv(t,Fv.bind(null,n))}n.callbackPriority=e,n.callbackNode=t}}function Fv(n,e){if(Ml=-1,Sl=0,Je&6)throw Error(ue(327));var t=n.callbackNode;if(Os()&&n.callbackNode!==t)return null;var i=Nl(n,n===Ft?jt:0);if(i===0)return null;if(i&30||i&n.expiredLanes||e)e=ql(n,i);else{e=i;var r=Je;Je|=2;var s=kv();(Ft!==n||jt!==e)&&(Mi=null,$s=St()+500,kr(n,e));do try{vM();break}catch(a){Ov(n,a)}while(!0);Cf(),Xl.current=s,Je=r,bt!==null?e=0:(Ft=null,jt=0,e=Rt)}if(e!==0){if(e===2&&(r=_d(n),r!==0&&(i=r,e=Xd(n,r))),e===1)throw t=ua,kr(n,0),qi(n,i),fn(n,St()),t;if(e===6)qi(n,i);else{if(r=n.current.alternate,!(i&30)&&!mM(r)&&(e=ql(n,i),e===2&&(s=_d(n),s!==0&&(i=s,e=Xd(n,s))),e===1))throw t=ua,kr(n,0),qi(n,i),fn(n,St()),t;switch(n.finishedWork=r,n.finishedLanes=i,e){case 0:case 1:throw Error(ue(345));case 2:Rr(n,ln,Mi);break;case 3:if(qi(n,i),(i&130023424)===i&&(e=jf+500-St(),10<e)){if(Nl(n,0)!==0)break;if(r=n.suspendedLanes,(r&i)!==i){sn(),n.pingedLanes|=n.suspendedLanes&r;break}n.timeoutHandle=Ad(Rr.bind(null,n,ln,Mi),e);break}Rr(n,ln,Mi);break;case 4:if(qi(n,i),(i&4194240)===i)break;for(e=n.eventTimes,r=-1;0<i;){var o=31-Qn(i);s=1<<o,o=e[o],o>r&&(r=o),i&=~s}if(i=r,i=St()-i,i=(120>i?120:480>i?480:1080>i?1080:1920>i?1920:3e3>i?3e3:4320>i?4320:1960*pM(i/1960))-i,10<i){n.timeoutHandle=Ad(Rr.bind(null,n,ln,Mi),i);break}Rr(n,ln,Mi);break;case 5:Rr(n,ln,Mi);break;default:throw Error(ue(329))}}}return fn(n,St()),n.callbackNode===t?Fv.bind(null,n):null}function Xd(n,e){var t=Vo;return n.current.memoizedState.isDehydrated&&(kr(n,e).flags|=256),n=ql(n,e),n!==2&&(e=ln,ln=t,e!==null&&$d(e)),n}function $d(n){ln===null?ln=n:ln.push.apply(ln,n)}function mM(n){for(var e=n;;){if(e.flags&16384){var t=e.updateQueue;if(t!==null&&(t=t.stores,t!==null))for(var i=0;i<t.length;i++){var r=t[i],s=r.getSnapshot;r=r.value;try{if(!ni(s(),r))return!1}catch{return!1}}}if(t=e.child,e.subtreeFlags&16384&&t!==null)t.return=e,e=t;else{if(e===n)break;for(;e.sibling===null;){if(e.return===null||e.return===n)return!0;e=e.return}e.sibling.return=e.return,e=e.sibling}}return!0}function qi(n,e){for(e&=~Vf,e&=~yc,n.suspendedLanes|=e,n.pingedLanes&=~e,n=n.expirationTimes;0<e;){var t=31-Qn(e),i=1<<t;n[t]=-1,e&=~i}}function Tp(n){if(Je&6)throw Error(ue(327));Os();var e=Nl(n,0);if(!(e&1))return fn(n,St()),null;var t=ql(n,e);if(n.tag!==0&&t===2){var i=_d(n);i!==0&&(e=i,t=Xd(n,i))}if(t===1)throw t=ua,kr(n,0),qi(n,e),fn(n,St()),t;if(t===6)throw Error(ue(345));return n.finishedWork=n.current.alternate,n.finishedLanes=e,Rr(n,ln,Mi),fn(n,St()),null}function Gf(n,e){var t=Je;Je|=1;try{return n(e)}finally{Je=t,Je===0&&($s=St()+500,gc&&xr())}}function Gr(n){Zi!==null&&Zi.tag===0&&!(Je&6)&&Os();var e=Je;Je|=1;var t=kn.transition,i=ot;try{if(kn.transition=null,ot=1,n)return n()}finally{ot=i,kn.transition=t,Je=e,!(Je&6)&&xr()}}function Wf(){vn=Rs.current,ht(Rs)}function kr(n,e){n.finishedWork=null,n.finishedLanes=0;var t=n.timeoutHandle;if(t!==-1&&(n.timeoutHandle=-1,Wy(t)),bt!==null)for(t=bt.return;t!==null;){var i=t;switch(Tf(i),i.tag){case 1:i=i.type.childContextTypes,i!=null&&Fl();break;case 3:Ws(),ht(un),ht(en),Df();break;case 5:If(i);break;case 4:Ws();break;case 13:ht(vt);break;case 19:ht(vt);break;case 10:Rf(i.type._context);break;case 22:case 23:Wf()}t=t.return}if(Ft=n,bt=n=lr(n.current,null),jt=vn=e,Rt=0,ua=null,Vf=yc=jr=0,ln=Vo=null,Ur!==null){for(e=0;e<Ur.length;e++)if(t=Ur[e],i=t.interleaved,i!==null){t.interleaved=null;var r=i.next,s=t.pending;if(s!==null){var o=s.next;s.next=r,i.next=o}t.pending=i}Ur=null}return n}function Ov(n,e){do{var t=bt;try{if(Cf(),_l.current=Wl,Gl){for(var i=_t.memoizedState;i!==null;){var r=i.queue;r!==null&&(r.pending=null),i=i.next}Gl=!1}if(Vr=0,Dt=Ct=_t=null,Bo=!1,aa=0,Hf.current=null,t===null||t.return===null){Rt=1,ua=e,bt=null;break}e:{var s=n,o=t.return,a=t,l=e;if(e=jt,a.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){var c=l,u=a,h=u.tag;if(!(u.mode&1)&&(h===0||h===11||h===15)){var p=u.alternate;p?(u.updateQueue=p.updateQueue,u.memoizedState=p.memoizedState,u.lanes=p.lanes):(u.updateQueue=null,u.memoizedState=null)}var f=fp(o);if(f!==null){f.flags&=-257,hp(f,o,a,s,e),f.mode&1&&dp(s,c,e),e=f,l=c;var g=e.updateQueue;if(g===null){var y=new Set;y.add(l),e.updateQueue=y}else g.add(l);break e}else{if(!(e&1)){dp(s,c,e),Xf();break e}l=Error(ue(426))}}else if(mt&&a.mode&1){var m=fp(o);if(m!==null){!(m.flags&65536)&&(m.flags|=256),hp(m,o,a,s,e),Af(Xs(l,a));break e}}s=l=Xs(l,a),Rt!==4&&(Rt=2),Vo===null?Vo=[s]:Vo.push(s),s=o;do{switch(s.tag){case 3:s.flags|=65536,e&=-e,s.lanes|=e;var d=yv(s,l,e);sp(s,d);break e;case 1:a=l;var v=s.type,_=s.stateNode;if(!(s.flags&128)&&(typeof v.getDerivedStateFromError=="function"||_!==null&&typeof _.componentDidCatch=="function"&&(or===null||!or.has(_)))){s.flags|=65536,e&=-e,s.lanes|=e;var M=Mv(s,a,e);sp(s,M);break e}}s=s.return}while(s!==null)}Bv(t)}catch(T){e=T,bt===t&&t!==null&&(bt=t=t.return);continue}break}while(!0)}function kv(){var n=Xl.current;return Xl.current=Wl,n===null?Wl:n}function Xf(){(Rt===0||Rt===3||Rt===2)&&(Rt=4),Ft===null||!(jr&268435455)&&!(yc&268435455)||qi(Ft,jt)}function ql(n,e){var t=Je;Je|=2;var i=kv();(Ft!==n||jt!==e)&&(Mi=null,kr(n,e));do try{gM();break}catch(r){Ov(n,r)}while(!0);if(Cf(),Je=t,Xl.current=i,bt!==null)throw Error(ue(261));return Ft=null,jt=0,Rt}function gM(){for(;bt!==null;)zv(bt)}function vM(){for(;bt!==null&&!Vx();)zv(bt)}function zv(n){var e=Vv(n.alternate,n,vn);n.memoizedProps=n.pendingProps,e===null?Bv(n):bt=e,Hf.current=null}function Bv(n){var e=n;do{var t=e.alternate;if(n=e.return,e.flags&32768){if(t=uM(t,e),t!==null){t.flags&=32767,bt=t;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{Rt=6,bt=null;return}}else if(t=cM(t,e,vn),t!==null){bt=t;return}if(e=e.sibling,e!==null){bt=e;return}bt=e=n}while(e!==null);Rt===0&&(Rt=5)}function Rr(n,e,t){var i=ot,r=kn.transition;try{kn.transition=null,ot=1,_M(n,e,t,i)}finally{kn.transition=r,ot=i}return null}function _M(n,e,t,i){do Os();while(Zi!==null);if(Je&6)throw Error(ue(327));t=n.finishedWork;var r=n.finishedLanes;if(t===null)return null;if(n.finishedWork=null,n.finishedLanes=0,t===n.current)throw Error(ue(177));n.callbackNode=null,n.callbackPriority=0;var s=t.lanes|t.childLanes;if(Jx(n,s),n===Ft&&(bt=Ft=null,jt=0),!(t.subtreeFlags&2064)&&!(t.flags&2064)||ka||(ka=!0,jv(Pl,function(){return Os(),null})),s=(t.flags&15990)!==0,t.subtreeFlags&15990||s){s=kn.transition,kn.transition=null;var o=ot;ot=1;var a=Je;Je|=4,Hf.current=null,fM(n,t),Dv(t,n),ky(wd),Ll=!!Ed,wd=Ed=null,n.current=t,hM(t),jx(),Je=a,ot=o,kn.transition=s}else n.current=t;if(ka&&(ka=!1,Zi=n,Yl=r),s=n.pendingLanes,s===0&&(or=null),Xx(t.stateNode),fn(n,St()),e!==null)for(i=n.onRecoverableError,t=0;t<e.length;t++)r=e[t],i(r.value,{componentStack:r.stack,digest:r.digest});if($l)throw $l=!1,n=Gd,Gd=null,n;return Yl&1&&n.tag!==0&&Os(),s=n.pendingLanes,s&1?n===Wd?jo++:(jo=0,Wd=n):jo=0,xr(),null}function Os(){if(Zi!==null){var n=y0(Yl),e=kn.transition,t=ot;try{if(kn.transition=null,ot=16>n?16:n,Zi===null)var i=!1;else{if(n=Zi,Zi=null,Yl=0,Je&6)throw Error(ue(331));var r=Je;for(Je|=4,ye=n.current;ye!==null;){var s=ye,o=s.child;if(ye.flags&16){var a=s.deletions;if(a!==null){for(var l=0;l<a.length;l++){var c=a[l];for(ye=c;ye!==null;){var u=ye;switch(u.tag){case 0:case 11:case 15:Ho(8,u,s)}var h=u.child;if(h!==null)h.return=u,ye=h;else for(;ye!==null;){u=ye;var p=u.sibling,f=u.return;if(Nv(u),u===c){ye=null;break}if(p!==null){p.return=f,ye=p;break}ye=f}}}var g=s.alternate;if(g!==null){var y=g.child;if(y!==null){g.child=null;do{var m=y.sibling;y.sibling=null,y=m}while(y!==null)}}ye=s}}if(s.subtreeFlags&2064&&o!==null)o.return=s,ye=o;else e:for(;ye!==null;){if(s=ye,s.flags&2048)switch(s.tag){case 0:case 11:case 15:Ho(9,s,s.return)}var d=s.sibling;if(d!==null){d.return=s.return,ye=d;break e}ye=s.return}}var v=n.current;for(ye=v;ye!==null;){o=ye;var _=o.child;if(o.subtreeFlags&2064&&_!==null)_.return=o,ye=_;else e:for(o=v;ye!==null;){if(a=ye,a.flags&2048)try{switch(a.tag){case 0:case 11:case 15:xc(9,a)}}catch(T){Mt(a,a.return,T)}if(a===o){ye=null;break e}var M=a.sibling;if(M!==null){M.return=a.return,ye=M;break e}ye=a.return}}if(Je=r,xr(),ci&&typeof ci.onPostCommitFiberRoot=="function")try{ci.onPostCommitFiberRoot(dc,n)}catch{}i=!0}return i}finally{ot=t,kn.transition=e}}return!1}function Ap(n,e,t){e=Xs(t,e),e=yv(n,e,1),n=sr(n,e,1),e=sn(),n!==null&&(ga(n,1,e),fn(n,e))}function Mt(n,e,t){if(n.tag===3)Ap(n,n,t);else for(;e!==null;){if(e.tag===3){Ap(e,n,t);break}else if(e.tag===1){var i=e.stateNode;if(typeof e.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(or===null||!or.has(i))){n=Xs(t,n),n=Mv(e,n,1),e=sr(e,n,1),n=sn(),e!==null&&(ga(e,1,n),fn(e,n));break}}e=e.return}}function xM(n,e,t){var i=n.pingCache;i!==null&&i.delete(e),e=sn(),n.pingedLanes|=n.suspendedLanes&t,Ft===n&&(jt&t)===t&&(Rt===4||Rt===3&&(jt&130023424)===jt&&500>St()-jf?kr(n,0):Vf|=t),fn(n,e)}function Hv(n,e){e===0&&(n.mode&1?(e=Ca,Ca<<=1,!(Ca&130023424)&&(Ca=4194304)):e=1);var t=sn();n=Ni(n,e),n!==null&&(ga(n,e,t),fn(n,t))}function yM(n){var e=n.memoizedState,t=0;e!==null&&(t=e.retryLane),Hv(n,t)}function MM(n,e){var t=0;switch(n.tag){case 13:var i=n.stateNode,r=n.memoizedState;r!==null&&(t=r.retryLane);break;case 19:i=n.stateNode;break;default:throw Error(ue(314))}i!==null&&i.delete(e),Hv(n,t)}var Vv;Vv=function(n,e,t){if(n!==null)if(n.memoizedProps!==e.pendingProps||un.current)cn=!0;else{if(!(n.lanes&t)&&!(e.flags&128))return cn=!1,lM(n,e,t);cn=!!(n.flags&131072)}else cn=!1,mt&&e.flags&1048576&&X0(e,zl,e.index);switch(e.lanes=0,e.tag){case 2:var i=e.type;yl(n,e),n=e.pendingProps;var r=Vs(e,en.current);Fs(e,t),r=Ff(null,e,i,n,r,t);var s=Of();return e.flags|=1,typeof r=="object"&&r!==null&&typeof r.render=="function"&&r.$$typeof===void 0?(e.tag=1,e.memoizedState=null,e.updateQueue=null,dn(i)?(s=!0,Ol(e)):s=!1,e.memoizedState=r.state!==null&&r.state!==void 0?r.state:null,Nf(e),r.updater=_c,e.stateNode=r,r._reactInternals=e,Id(e,i,n,t),e=Fd(null,e,i,!0,s,t)):(e.tag=0,mt&&s&&wf(e),rn(null,e,r,t),e=e.child),e;case 16:i=e.elementType;e:{switch(yl(n,e),n=e.pendingProps,r=i._init,i=r(i._payload),e.type=i,r=e.tag=EM(i),n=Yn(i,n),r){case 0:e=Ud(null,e,i,n,t);break e;case 1:e=gp(null,e,i,n,t);break e;case 11:e=pp(null,e,i,n,t);break e;case 14:e=mp(null,e,i,Yn(i.type,n),t);break e}throw Error(ue(306,i,""))}return e;case 0:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Yn(i,r),Ud(n,e,i,r,t);case 1:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Yn(i,r),gp(n,e,i,r,t);case 3:e:{if(Tv(e),n===null)throw Error(ue(387));i=e.pendingProps,s=e.memoizedState,r=s.element,J0(n,e),Vl(e,i,null,t);var o=e.memoizedState;if(i=o.element,s.isDehydrated)if(s={element:i,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},e.updateQueue.baseState=s,e.memoizedState=s,e.flags&256){r=Xs(Error(ue(423)),e),e=vp(n,e,i,t,r);break e}else if(i!==r){r=Xs(Error(ue(424)),e),e=vp(n,e,i,t,r);break e}else for(Mn=rr(e.stateNode.containerInfo.firstChild),wn=e,mt=!0,Kn=null,t=K0(e,null,i,t),e.child=t;t;)t.flags=t.flags&-3|4096,t=t.sibling;else{if(js(),i===r){e=Li(n,e,t);break e}rn(n,e,i,t)}e=e.child}return e;case 5:return Q0(e),n===null&&Pd(e),i=e.type,r=e.pendingProps,s=n!==null?n.memoizedProps:null,o=r.children,Td(i,r)?o=null:s!==null&&Td(i,s)&&(e.flags|=32),wv(n,e),rn(n,e,o,t),e.child;case 6:return n===null&&Pd(e),null;case 13:return Av(n,e,t);case 4:return Lf(e,e.stateNode.containerInfo),i=e.pendingProps,n===null?e.child=Gs(e,null,i,t):rn(n,e,i,t),e.child;case 11:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Yn(i,r),pp(n,e,i,r,t);case 7:return rn(n,e,e.pendingProps,t),e.child;case 8:return rn(n,e,e.pendingProps.children,t),e.child;case 12:return rn(n,e,e.pendingProps.children,t),e.child;case 10:e:{if(i=e.type._context,r=e.pendingProps,s=e.memoizedProps,o=r.value,ut(Bl,i._currentValue),i._currentValue=o,s!==null)if(ni(s.value,o)){if(s.children===r.children&&!un.current){e=Li(n,e,t);break e}}else for(s=e.child,s!==null&&(s.return=e);s!==null;){var a=s.dependencies;if(a!==null){o=s.child;for(var l=a.firstContext;l!==null;){if(l.context===i){if(s.tag===1){l=bi(-1,t&-t),l.tag=2;var c=s.updateQueue;if(c!==null){c=c.shared;var u=c.pending;u===null?l.next=l:(l.next=u.next,u.next=l),c.pending=l}}s.lanes|=t,l=s.alternate,l!==null&&(l.lanes|=t),Nd(s.return,t,e),a.lanes|=t;break}l=l.next}}else if(s.tag===10)o=s.type===e.type?null:s.child;else if(s.tag===18){if(o=s.return,o===null)throw Error(ue(341));o.lanes|=t,a=o.alternate,a!==null&&(a.lanes|=t),Nd(o,t,e),o=s.sibling}else o=s.child;if(o!==null)o.return=s;else for(o=s;o!==null;){if(o===e){o=null;break}if(s=o.sibling,s!==null){s.return=o.return,o=s;break}o=o.return}s=o}rn(n,e,r.children,t),e=e.child}return e;case 9:return r=e.type,i=e.pendingProps.children,Fs(e,t),r=Hn(r),i=i(r),e.flags|=1,rn(n,e,i,t),e.child;case 14:return i=e.type,r=Yn(i,e.pendingProps),r=Yn(i.type,r),mp(n,e,i,r,t);case 15:return Sv(n,e,e.type,e.pendingProps,t);case 17:return i=e.type,r=e.pendingProps,r=e.elementType===i?r:Yn(i,r),yl(n,e),e.tag=1,dn(i)?(n=!0,Ol(e)):n=!1,Fs(e,t),xv(e,i,r),Id(e,i,r,t),Fd(null,e,i,!0,n,t);case 19:return bv(n,e,t);case 22:return Ev(n,e,t)}throw Error(ue(156,e.tag))};function jv(n,e){return g0(n,e)}function SM(n,e,t,i){this.tag=n,this.key=t,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=e,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function On(n,e,t,i){return new SM(n,e,t,i)}function $f(n){return n=n.prototype,!(!n||!n.isReactComponent)}function EM(n){if(typeof n=="function")return $f(n)?1:0;if(n!=null){if(n=n.$$typeof,n===ff)return 11;if(n===hf)return 14}return 2}function lr(n,e){var t=n.alternate;return t===null?(t=On(n.tag,e,n.key,n.mode),t.elementType=n.elementType,t.type=n.type,t.stateNode=n.stateNode,t.alternate=n,n.alternate=t):(t.pendingProps=e,t.type=n.type,t.flags=0,t.subtreeFlags=0,t.deletions=null),t.flags=n.flags&14680064,t.childLanes=n.childLanes,t.lanes=n.lanes,t.child=n.child,t.memoizedProps=n.memoizedProps,t.memoizedState=n.memoizedState,t.updateQueue=n.updateQueue,e=n.dependencies,t.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext},t.sibling=n.sibling,t.index=n.index,t.ref=n.ref,t}function El(n,e,t,i,r,s){var o=2;if(i=n,typeof n=="function")$f(n)&&(o=1);else if(typeof n=="string")o=5;else e:switch(n){case xs:return zr(t.children,r,s,e);case df:o=8,r|=8;break;case id:return n=On(12,t,e,r|2),n.elementType=id,n.lanes=s,n;case rd:return n=On(13,t,e,r),n.elementType=rd,n.lanes=s,n;case sd:return n=On(19,t,e,r),n.elementType=sd,n.lanes=s,n;case Qg:return Mc(t,r,s,e);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case Zg:o=10;break e;case Jg:o=9;break e;case ff:o=11;break e;case hf:o=14;break e;case Wi:o=16,i=null;break e}throw Error(ue(130,n==null?n:typeof n,""))}return e=On(o,t,e,r),e.elementType=n,e.type=i,e.lanes=s,e}function zr(n,e,t,i){return n=On(7,n,i,e),n.lanes=t,n}function Mc(n,e,t,i){return n=On(22,n,i,e),n.elementType=Qg,n.lanes=t,n.stateNode={isHidden:!1},n}function ou(n,e,t){return n=On(6,n,null,e),n.lanes=t,n}function au(n,e,t){return e=On(4,n.children!==null?n.children:[],n.key,e),e.lanes=t,e.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},e}function wM(n,e,t,i,r){this.tag=e,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Hc(0),this.expirationTimes=Hc(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Hc(0),this.identifierPrefix=i,this.onRecoverableError=r,this.mutableSourceEagerHydrationData=null}function Yf(n,e,t,i,r,s,o,a,l){return n=new wM(n,e,t,a,l),e===1?(e=1,s===!0&&(e|=8)):e=0,s=On(3,null,null,e),n.current=s,s.stateNode=n,s.memoizedState={element:i,isDehydrated:t,cache:null,transitions:null,pendingSuspenseBoundaries:null},Nf(s),n}function TM(n,e,t){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:_s,key:i==null?null:""+i,children:n,containerInfo:e,implementation:t}}function Gv(n){if(!n)return fr;n=n._reactInternals;e:{if(Xr(n)!==n||n.tag!==1)throw Error(ue(170));var e=n;do{switch(e.tag){case 3:e=e.stateNode.context;break e;case 1:if(dn(e.type)){e=e.stateNode.__reactInternalMemoizedMergedChildContext;break e}}e=e.return}while(e!==null);throw Error(ue(171))}if(n.tag===1){var t=n.type;if(dn(t))return G0(n,t,e)}return e}function Wv(n,e,t,i,r,s,o,a,l){return n=Yf(t,i,!0,n,r,s,o,a,l),n.context=Gv(null),t=n.current,i=sn(),r=ar(t),s=bi(i,r),s.callback=e??null,sr(t,s,r),n.current.lanes=r,ga(n,r,i),fn(n,i),n}function Sc(n,e,t,i){var r=e.current,s=sn(),o=ar(r);return t=Gv(t),e.context===null?e.context=t:e.pendingContext=t,e=bi(s,o),e.payload={element:n},i=i===void 0?null:i,i!==null&&(e.callback=i),n=sr(r,e,o),n!==null&&(ei(n,r,o,s),vl(n,r,o)),o}function Kl(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function bp(n,e){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var t=n.retryLane;n.retryLane=t!==0&&t<e?t:e}}function qf(n,e){bp(n,e),(n=n.alternate)&&bp(n,e)}function AM(){return null}var Xv=typeof reportError=="function"?reportError:function(n){console.error(n)};function Kf(n){this._internalRoot=n}Ec.prototype.render=Kf.prototype.render=function(n){var e=this._internalRoot;if(e===null)throw Error(ue(409));Sc(n,e,null,null)};Ec.prototype.unmount=Kf.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var e=n.containerInfo;Gr(function(){Sc(null,n,null,null)}),e[Pi]=null}};function Ec(n){this._internalRoot=n}Ec.prototype.unstable_scheduleHydration=function(n){if(n){var e=E0();n={blockedOn:null,target:n,priority:e};for(var t=0;t<Yi.length&&e!==0&&e<Yi[t].priority;t++);Yi.splice(t,0,n),t===0&&T0(n)}};function Zf(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function wc(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function Cp(){}function bM(n,e,t,i,r){if(r){if(typeof i=="function"){var s=i;i=function(){var c=Kl(o);s.call(c)}}var o=Wv(e,i,n,0,null,!1,!1,"",Cp);return n._reactRootContainer=o,n[Pi]=o.current,na(n.nodeType===8?n.parentNode:n),Gr(),o}for(;r=n.lastChild;)n.removeChild(r);if(typeof i=="function"){var a=i;i=function(){var c=Kl(l);a.call(c)}}var l=Yf(n,0,!1,null,null,!1,!1,"",Cp);return n._reactRootContainer=l,n[Pi]=l.current,na(n.nodeType===8?n.parentNode:n),Gr(function(){Sc(e,l,t,i)}),l}function Tc(n,e,t,i,r){var s=t._reactRootContainer;if(s){var o=s;if(typeof r=="function"){var a=r;r=function(){var l=Kl(o);a.call(l)}}Sc(e,o,n,r)}else o=bM(t,e,n,r,i);return Kl(o)}M0=function(n){switch(n.tag){case 3:var e=n.stateNode;if(e.current.memoizedState.isDehydrated){var t=Po(e.pendingLanes);t!==0&&(gf(e,t|1),fn(e,St()),!(Je&6)&&($s=St()+500,xr()))}break;case 13:Gr(function(){var i=Ni(n,1);if(i!==null){var r=sn();ei(i,n,1,r)}}),qf(n,1)}};vf=function(n){if(n.tag===13){var e=Ni(n,134217728);if(e!==null){var t=sn();ei(e,n,134217728,t)}qf(n,134217728)}};S0=function(n){if(n.tag===13){var e=ar(n),t=Ni(n,e);if(t!==null){var i=sn();ei(t,n,e,i)}qf(n,e)}};E0=function(){return ot};w0=function(n,e){var t=ot;try{return ot=n,e()}finally{ot=t}};md=function(n,e,t){switch(e){case"input":if(ld(n,t),e=t.name,t.type==="radio"&&e!=null){for(t=n;t.parentNode;)t=t.parentNode;for(t=t.querySelectorAll("input[name="+JSON.stringify(""+e)+'][type="radio"]'),e=0;e<t.length;e++){var i=t[e];if(i!==n&&i.form===n.form){var r=mc(i);if(!r)throw Error(ue(90));t0(i),ld(i,r)}}}break;case"textarea":i0(n,t);break;case"select":e=t.value,e!=null&&Ls(n,!!t.multiple,e,!1)}};u0=Gf;d0=Gr;var CM={usingClientEntryPoint:!1,Events:[_a,Es,mc,l0,c0,Gf]},xo={findFiberByHostInstance:Dr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},RM={bundleType:xo.bundleType,version:xo.version,rendererPackageName:xo.rendererPackageName,rendererConfig:xo.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Ii.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=p0(n),n===null?null:n.stateNode},findFiberByHostInstance:xo.findFiberByHostInstance||AM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var za=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!za.isDisabled&&za.supportsFiber)try{dc=za.inject(RM),ci=za}catch{}}An.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=CM;An.createPortal=function(n,e){var t=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Zf(e))throw Error(ue(200));return TM(n,e,null,t)};An.createRoot=function(n,e){if(!Zf(n))throw Error(ue(299));var t=!1,i="",r=Xv;return e!=null&&(e.unstable_strictMode===!0&&(t=!0),e.identifierPrefix!==void 0&&(i=e.identifierPrefix),e.onRecoverableError!==void 0&&(r=e.onRecoverableError)),e=Yf(n,1,!1,null,null,t,!1,i,r),n[Pi]=e.current,na(n.nodeType===8?n.parentNode:n),new Kf(e)};An.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var e=n._reactInternals;if(e===void 0)throw typeof n.render=="function"?Error(ue(188)):(n=Object.keys(n).join(","),Error(ue(268,n)));return n=p0(e),n=n===null?null:n.stateNode,n};An.flushSync=function(n){return Gr(n)};An.hydrate=function(n,e,t){if(!wc(e))throw Error(ue(200));return Tc(null,n,e,!0,t)};An.hydrateRoot=function(n,e,t){if(!Zf(n))throw Error(ue(405));var i=t!=null&&t.hydratedSources||null,r=!1,s="",o=Xv;if(t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(s=t.identifierPrefix),t.onRecoverableError!==void 0&&(o=t.onRecoverableError)),e=Wv(e,null,n,1,t??null,r,!1,s,o),n[Pi]=e.current,na(n),i)for(n=0;n<i.length;n++)t=i[n],r=t._getVersion,r=r(t._source),e.mutableSourceEagerHydrationData==null?e.mutableSourceEagerHydrationData=[t,r]:e.mutableSourceEagerHydrationData.push(t,r);return new Ec(e)};An.render=function(n,e,t){if(!wc(e))throw Error(ue(200));return Tc(null,n,e,!1,t)};An.unmountComponentAtNode=function(n){if(!wc(n))throw Error(ue(40));return n._reactRootContainer?(Gr(function(){Tc(null,null,n,!1,function(){n._reactRootContainer=null,n[Pi]=null})}),!0):!1};An.unstable_batchedUpdates=Gf;An.unstable_renderSubtreeIntoContainer=function(n,e,t,i){if(!wc(t))throw Error(ue(200));if(n==null||n._reactInternals===void 0)throw Error(ue(38));return Tc(n,e,t,!1,i)};An.version="18.3.1-next-f1338f8080-20240426";function $v(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE($v)}catch(n){console.error(n)}}$v(),$g.exports=An;var PM=$g.exports,Yv,Rp=PM;Yv=Rp.createRoot,Rp.hydrateRoot;const NM={},Pp=n=>{let e;const t=new Set,i=(u,h)=>{const p=typeof u=="function"?u(e):u;if(!Object.is(p,e)){const f=e;e=h??(typeof p!="object"||p===null)?p:Object.assign({},e,p),t.forEach(g=>g(e,f))}},r=()=>e,l={setState:i,getState:r,getInitialState:()=>c,subscribe:u=>(t.add(u),()=>t.delete(u)),destroy:()=>{(NM?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),t.clear()}},c=e=n(i,r,l);return l},LM=n=>n?Pp(n):Pp;var qv={exports:{}},Kv={},Zv={exports:{}},Jv={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Ys=te;function IM(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var DM=typeof Object.is=="function"?Object.is:IM,UM=Ys.useState,FM=Ys.useEffect,OM=Ys.useLayoutEffect,kM=Ys.useDebugValue;function zM(n,e){var t=e(),i=UM({inst:{value:t,getSnapshot:e}}),r=i[0].inst,s=i[1];return OM(function(){r.value=t,r.getSnapshot=e,lu(r)&&s({inst:r})},[n,t,e]),FM(function(){return lu(r)&&s({inst:r}),n(function(){lu(r)&&s({inst:r})})},[n]),kM(t),t}function lu(n){var e=n.getSnapshot;n=n.value;try{var t=e();return!DM(n,t)}catch{return!0}}function BM(n,e){return e()}var HM=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?BM:zM;Jv.useSyncExternalStore=Ys.useSyncExternalStore!==void 0?Ys.useSyncExternalStore:HM;Zv.exports=Jv;var VM=Zv.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Ac=te,jM=VM;function GM(n,e){return n===e&&(n!==0||1/n===1/e)||n!==n&&e!==e}var WM=typeof Object.is=="function"?Object.is:GM,XM=jM.useSyncExternalStore,$M=Ac.useRef,YM=Ac.useEffect,qM=Ac.useMemo,KM=Ac.useDebugValue;Kv.useSyncExternalStoreWithSelector=function(n,e,t,i,r){var s=$M(null);if(s.current===null){var o={hasValue:!1,value:null};s.current=o}else o=s.current;s=qM(function(){function l(f){if(!c){if(c=!0,u=f,f=i(f),r!==void 0&&o.hasValue){var g=o.value;if(r(g,f))return h=g}return h=f}if(g=h,WM(u,f))return g;var y=i(f);return r!==void 0&&r(g,y)?(u=f,g):(u=f,h=y)}var c=!1,u,h,p=t===void 0?null:t;return[function(){return l(e())},p===null?void 0:function(){return l(p())}]},[e,t,i,r]);var a=XM(n,s[0],s[1]);return YM(function(){o.hasValue=!0,o.value=a},[a]),KM(a),a};qv.exports=Kv;var ZM=qv.exports;const JM=Ug(ZM),Qv={},{useDebugValue:QM}=xx,{useSyncExternalStoreWithSelector:eS}=JM;let Np=!1;const tS=n=>n;function nS(n,e=tS,t){(Qv?"production":void 0)!=="production"&&t&&!Np&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),Np=!0);const i=eS(n.subscribe,n.getState,n.getServerState||n.getInitialState,e,t);return QM(i),i}const Lp=n=>{(Qv?"production":void 0)!=="production"&&typeof n!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const e=typeof n=="function"?LM(n):n,t=(i,r)=>nS(e,i,r);return Object.assign(t,e),t},ro=n=>n?Lp(n):Lp,iS=1.2,Ip=.07,Zl=.13,yn=.36,gs={R2:1.341,R3:1.285,R4:1.06,R5:.803,R6:1.341},Go=Math.PI*(100/180),Zn=["R1","R2","R3","R4","R5","R6","R7"],yt=[{id:"J1",label:"CUBE L",type:"twist",bodyA:"R1",bodyB:"R2",limit:Math.PI},{id:"J2",label:"JOINT 1",type:"bend",bodyA:"R2",bodyB:"R3",limit:Go},{id:"J3",label:"JOINT 2",type:"bend",bodyA:"R3",bodyB:"R4",limit:Go},{id:"J4",label:"WRIST",type:"twist",bodyA:"R4",bodyB:"R5",limit:Math.PI},{id:"J5",label:"JOINT 3",type:"bend",bodyA:"R5",bodyB:"R6",limit:Go},{id:"J6",label:"CUBE R",type:"twist",bodyA:"R6",bodyB:"R7",limit:Math.PI}],rS=()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}),ct=ro((n,e)=>({activeRootId:"R1",jointAngles:[0,0,0,0,0,0],joints:Array.from({length:6},rS),isDragging:!1,status:"idle",endEffectorPosition:{x:0,y:0,z:0},reachPercent:0,pendingHome:!1,mode:"horizontal",setRootRod:t=>{t!==e().activeRootId&&n({activeRootId:t})},setRootAndAngles:(t,i)=>{const r=i.map((s,o)=>{const a=yt[o].limit;return Math.max(-a,Math.min(a,s))});n({activeRootId:t,jointAngles:r})},setJointAngle:(t,i)=>{const r=yt[t].limit,s=Math.max(-r,Math.min(r,i)),o=[...e().jointAngles];o[t]=s,n({jointAngles:o})},setJointTelemetry:t=>n({joints:t}),setStatus:t=>n({status:t}),updateEndEffector:(t,i)=>n({endEffectorPosition:t,reachPercent:i}),homeArm:()=>n({pendingHome:!0}),clearPendingHome:()=>n({pendingHome:!1}),setMode:t=>n({mode:t}),collision:!1,setCollision:t=>n({collision:t}),setAllAngles:t=>{const i=t.map((r,s)=>{const o=yt[s].limit;return Math.max(-o,Math.min(o,r))});n({jointAngles:i})}})),Dp=(n,e,t={x:0,y:0,z:0})=>({id:n,label:e,angles:[0,0,0,0,0,0],activeRootId:"R1",position:{x:t.x??0,y:t.y??0,z:t.z??0},quaternion:{x:0,y:0,z:0,w:1},mode:"horizontal"}),Re=ro((n,e)=>({modules:[Dp("module-0","Module 1",{x:0,y:0,z:0})],activeModuleId:"module-0",nextId:1,welds:[],setModuleAngles(t,i){n(r=>({modules:r.modules.map(s=>s.id===t?{...s,angles:[...i]}:s)}))},setModuleTransform(t,i,r){n(s=>({modules:s.modules.map(o=>o.id===t?{...o,position:{x:i.x,y:i.y,z:i.z},quaternion:{x:r.x,y:r.y,z:r.z,w:r.w}}:o)}))},connectMode:!1,face1:null,face2:null,connectError:null,deleteMode:!1,setDeleteMode(t){n({deleteMode:t})},disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null,removeModule(t){const{modules:i,activeModuleId:r,welds:s}=e();if(i.length<=1)return;const o=i.filter(c=>c.id!==t).map((c,u)=>({...c,label:`Module ${u+1}`})),a=r===t?o[0].id:r,l=s.filter(c=>c.a.moduleId!==t&&c.b.moduleId!==t);n({modules:o,activeModuleId:a,welds:l})},addModule(t=null){const i=e().modules;let r;if(t&&typeof t.z=="number")r={x:t.x??0,y:t.y??0,z:t.z};else{const l=new Set(i.map(u=>Math.round(u.position.z/4)));let c=0;for(;l.has(c);)c++;r={x:0,y:0,z:c*4}}const o=`module-${e().nextId}`,a=`Module ${i.length+1}`;return n(l=>({modules:[...l.modules,Dp(o,a,r)],nextId:l.nextId+1})),o},setActiveModule(t){n({activeModuleId:t})},saveModuleState(t,{angles:i,activeRootId:r,position:s,quaternion:o,mode:a}){n(l=>({modules:l.modules.map(c=>c.id===t?{...c,angles:i,activeRootId:r,position:s,quaternion:o,mode:a}:c)}))},setConnectMode(t){n({connectMode:t,face1:null,face2:null,connectError:null})},setDisconnectMode(t){n({disconnectMode:t,dSel1:null,dSel2:null,disconnectError:null})},setDSel1(t){n({dSel1:t,disconnectError:null})},setDSel2(t){n({dSel2:t,disconnectError:null})},clearDSelections(){n({dSel1:null,dSel2:null,disconnectError:null})},setDisconnectError(t){n({disconnectError:t})},disconnectAll(){n(t=>({welds:[],modules:t.modules.map((i,r)=>({...i,angles:[0,0,0,0,0,0],position:{x:0,y:0,z:r*4},quaternion:{x:0,y:0,z:0,w:1}})),disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null}))},applyDisconnect(t){n(i=>{const r=new Set(i.modules.filter(l=>l.id!==t).map(l=>Math.round(l.position.z/4)));let s=0;for(;r.has(s);)s++;const o=i.dSel1,a=i.welds.filter(l=>{const c=new Set([l.a.moduleId,l.b.moduleId]);return!(c.has(t)&&c.has(o))});return{modules:i.modules.map(l=>l.id===t?{...l,position:{x:0,y:0,z:s*4},quaternion:{x:0,y:0,z:0,w:1}}:l),welds:a,disconnectMode:!1,dSel1:null,dSel2:null,disconnectError:null}})},setFace1(t){n({face1:t,connectError:null})},setFace2(t){n({face2:t,connectError:null})},clearFaces(){n({face1:null,face2:null,connectError:null})},setConnectError(t){n({connectError:t})},applyJoin(t=null){n(i=>{let r=i.welds;return t&&(r=i.welds.filter(s=>{const o=new Set([s.a.moduleId,s.b.moduleId]);return!(o.has(t.a.moduleId)&&o.has(t.b.moduleId))}),r=[...r,t]),{welds:r,connectMode:!1,face1:null,face2:null,connectError:null}})}})),oe={camera:null,animateTo:null,fitCamera:null,orbitDelta:null,getArmNodes:null},e_="tetrobot-project",t_=1;function Jf(){var e;(e=oe.commitLiveState)==null||e.call(oe);const n=Re.getState();return{format:e_,version:t_,app:"TETROBOT",savedAt:new Date().toISOString(),scene:{activeModuleId:n.activeModuleId,nextId:n.nextId,modules:n.modules.map(t=>({id:t.id,label:t.label,angles:[...t.angles],activeRootId:t.activeRootId,position:{...t.position},quaternion:{...t.quaternion},mode:t.mode})),welds:n.welds.map(t=>({a:{moduleId:t.a.moduleId,faceKey:t.a.faceKey},b:{moduleId:t.b.moduleId,faceKey:t.b.faceKey},mate:Array.isArray(t.mate)?[...t.mate]:null}))}}}const ki=(n,e=0)=>Number.isFinite(+n)?+n:e;function sS(n){if(!n||typeof n!="object"||n.format!==e_)throw new Error("Not a TETROBOT project file.");if(typeof n.version!="number"||n.version>t_)throw new Error(`Unsupported project version: ${n.version}`);const e=n.scene??{},t=Array.isArray(e.modules)?e.modules:[];if(t.length===0)throw new Error("Project contains no modules.");const i=t.map((l,c)=>{var u,h,p,f,g,y,m;return{id:String((l==null?void 0:l.id)??`module-${c}`),label:String((l==null?void 0:l.label)??`Module ${c+1}`),angles:Array.isArray(l==null?void 0:l.angles)&&l.angles.length===6?l.angles.map(d=>ki(d,0)):[0,0,0,0,0,0],activeRootId:typeof(l==null?void 0:l.activeRootId)=="string"?l.activeRootId:"R1",position:{x:ki((u=l==null?void 0:l.position)==null?void 0:u.x),y:ki((h=l==null?void 0:l.position)==null?void 0:h.y),z:ki((p=l==null?void 0:l.position)==null?void 0:p.z)},quaternion:{x:ki((f=l==null?void 0:l.quaternion)==null?void 0:f.x),y:ki((g=l==null?void 0:l.quaternion)==null?void 0:g.y),z:ki((y=l==null?void 0:l.quaternion)==null?void 0:y.z),w:((m=l==null?void 0:l.quaternion)==null?void 0:m.w)==null?1:ki(l.quaternion.w,1)},mode:(l==null?void 0:l.mode)==="vertical"?"vertical":"horizontal"}}),r=new Set(i.map(l=>l.id)),s=r.has(e.activeModuleId)?e.activeModuleId:i[0].id,o=(Array.isArray(e.welds)?e.welds:[]).filter(l=>{var c,u;return((c=l==null?void 0:l.a)==null?void 0:c.moduleId)&&((u=l==null?void 0:l.b)==null?void 0:u.moduleId)&&r.has(l.a.moduleId)&&r.has(l.b.moduleId)}).map(l=>({a:{moduleId:l.a.moduleId,faceKey:l.a.faceKey},b:{moduleId:l.b.moduleId,faceKey:l.b.faceKey},mate:Array.isArray(l.mate)&&l.mate.length===16?l.mate.map(Number):null}));let a=Number(e.nextId);return Number.isFinite(a)||(a=1+i.reduce((l,c)=>{const u=parseInt(String(c.id).replace(/\D/g,""),10);return Number.isFinite(u)?Math.max(l,u):l},0)),{modules:i,welds:o,activeModuleId:s,nextId:a}}const n_="TETROBOT::nischay::v2::format-key::do-not-redistribute",i_=[78,83,72,67,82,89],r_=2,Yd=new TextEncoder,Up=new TextDecoder;async function Qf(n){return new Uint8Array(await crypto.subtle.digest("SHA-256",n))}function Jl(n){let e=0;for(const r of n)e+=r.length;const t=new Uint8Array(e);let i=0;for(const r of n)t.set(r,i),i+=r.length;return t}function oS(n){return new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255])}async function s_(n,e){const t=new Uint8Array(e);let i=0,r=0;for(;i<e;){const s=await Qf(Jl([n,oS(r)])),o=Math.min(32,e-i);t.set(s.subarray(0,o),i),i+=o,r++}return t}function o_(n,e){const t=new Uint8Array(n.length);for(let i=0;i<n.length;i++)t[i]=n[i]^e[i];return t}async function a_(n){const e=Yd.encode(JSON.stringify(n)),t=crypto.getRandomValues(new Uint8Array(16)),i=await Qf(Jl([Yd.encode(n_),t])),r=await s_(i,e.length),s=o_(e,r);return Jl([new Uint8Array(i_),new Uint8Array([r_,0]),t,s])}async function Fp(n){const e=new Uint8Array(n);if(e.length===0)throw new Error("Empty file.");if(e[0]===123||e[0]===32||e[0]===10||e[0]===9||e[0]===239)try{return JSON.parse(Up.decode(e))}catch{}if(e.length<24||!i_.every((a,l)=>e[l]===a))throw new Error("Not a TETROBOT .nischay file.");if(e[6]>r_)throw new Error("File was made with a newer version — update the app.");const t=e.slice(8,24),i=e.slice(24),r=await Qf(Jl([Yd.encode(n_),t])),s=await s_(r,i.length),o=o_(i,s);return JSON.parse(Up.decode(o))}const aS={"application/octet-stream":[".nischay"]},lS={"application/octet-stream":[".nischay"],"application/json":[".json"]};function wl(n,e){const t=URL.createObjectURL(n),i=document.createElement("a");i.href=t,i.download=e,i.click(),URL.revokeObjectURL(t)}async function l_(n,e="untitled.nischay"){const t=await a_(n);if(window.showSaveFilePicker)try{const i=await window.showSaveFilePicker({suggestedName:e,types:[{description:"TETROBOT Project",accept:aS}]}),r=await i.createWritable();return await r.write(t),await r.close(),{name:i.name,handle:i}}catch(i){if((i==null?void 0:i.name)==="AbortError")return null}return wl(new Blob([t],{type:"application/octet-stream"}),e),{name:e,handle:null}}async function c_(){if(window.showOpenFilePicker)try{const[n]=await window.showOpenFilePicker({types:[{description:"TETROBOT Project",accept:lS}]}),e=await n.getFile();return{data:await Fp(await e.arrayBuffer()),name:n.name,handle:n}}catch(n){if((n==null?void 0:n.name)==="AbortError")return null;throw n}return new Promise((n,e)=>{const t=document.createElement("input");t.type="file",t.accept=".nischay,.json",t.onchange=async()=>{var r;const i=(r=t.files)==null?void 0:r[0];if(!i){n(null);return}try{n({data:await Fp(await i.arrayBuffer()),name:i.name,handle:null})}catch(s){e(s)}},t.click()})}async function cS(n,e){const t=await a_(e),i=await n.createWritable();await i.write(t),await i.close()}const zn=ro(n=>({name:null,handle:null,status:"idle",setDoc:(e,t)=>n({name:e,handle:t,status:t?"saved":"idle"}),setStatus:e=>n({status:e})})),da=180/Math.PI,u_=Math.PI/180,Op=[{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"},{main:"#0088ff",glow:"#0088ff33",track:"#d0e8ff",neg:"#cc3344"},{main:"#9944ff",glow:"#9944ff33",track:"#e8d8ff",neg:"#cc3344"},{main:"#00aabb",glow:"#00aabb33",track:"#ccf0f4",neg:"#cc3344"},{main:"#cc8800",glow:"#cc880033",track:"#fff0cc",neg:"#cc3344"}];function kp({value:n,format:e,className:t,style:i}){const r=te.useRef(null),s=te.useRef(n),o=te.useRef(null);return te.useEffect(()=>{const a=n,l=()=>{s.current+=(a-s.current)*.14,r.current&&(r.current.textContent=e(s.current)),Math.abs(a-s.current)>.005&&(o.current=requestAnimationFrame(l))};return o.current=requestAnimationFrame(l),()=>{o.current&&cancelAnimationFrame(o.current)}},[n,e]),x.jsx("span",{ref:r,className:t,style:i,children:e(n)})}function uS({rawAngle:n,palette:e,panelIdx:t,limit:i,onJointSet:r}){const[s,o]=te.useState(!1),[a,l]=te.useState(""),c=te.useRef(null),u=(n*da+180).toFixed(1),h=te.useCallback(()=>{l((n*da+180).toFixed(1)),o(!0)},[n]);te.useEffect(()=>{s&&c.current&&(c.current.focus(),c.current.select())},[s]);const p=te.useCallback(()=>{const g=parseFloat(a);if(!isNaN(g)&&r){const y=(g-180)*u_,m=Math.max(-i,Math.min(i,y));r(t,m)}o(!1)},[a,r,t,i]),f=te.useCallback(g=>{g.key==="Enter"&&(g.preventDefault(),p()),g.key==="Escape"&&o(!1)},[p]);return s?x.jsx("input",{ref:c,className:"angle-input editing",style:{color:e==null?void 0:e.main},type:"text",value:a,onChange:g=>l(g.target.value),onBlur:p,onKeyDown:f}):x.jsxs("span",{className:"stat-val angle-input-display",style:{color:e==null?void 0:e.main,cursor:"text"},title:"Click to set angle (80–280° bend · 0–360° twist)",onClick:h,children:[u,"°"]})}function dS({angle:n,rawAngle:e,limit:t,limitHit:i,palette:r,panelIdx:s,onDrag:o}){const h=te.useRef(null),p=te.useRef(!1),f=te.useRef(null);te.useEffect(()=>()=>{f.current&&cancelAnimationFrame(f.current)},[]);const g=i?"#ffdddd":(r==null?void 0:r.track)??"#d0e8ff",y=i?(r==null?void 0:r.neg)??"#cc3344":(r==null?void 0:r.main)??"#0088ff",m=i?"#ff5533":(r==null?void 0:r.main)??"#0088ff",d=p.current?e??n:n;function v(V,j,Q=1){const $=K=>(K-90)*(Math.PI/180),F=44+36*Math.cos($(V)),H=44+36*Math.sin($(V)),W=44+36*Math.cos($(j)),z=44+36*Math.sin($(j)),re=Math.abs(j-V)>180?1:0;return`M ${F} ${H} A 36 36 0 ${re} ${Q} ${W} ${z}`}const _=t*180/Math.PI,M=d*180/Math.PI,T=Math.max(-_,Math.min(_,M)),b=(T-90)*(Math.PI/180),E=44+36*Math.cos(b),P=44+36*Math.sin(b),A=te.useCallback(V=>{const j=h.current;if(!j)return 0;const Q=j.getBoundingClientRect(),$=V.clientX-Q.left,F=V.clientY-Q.top,H=Math.atan2($-44,-(F-44))*da;return Math.max(-t,Math.min(t,H*u_))},[44,44,t]),S=te.useCallback(V=>{if(V.currentTarget.setPointerCapture(V.pointerId),p.current=!0,!o)return;const j=A(V),Q=e??n;f.current&&(cancelAnimationFrame(f.current),f.current=null);const $=performance.now(),F=220,H=()=>{const W=Math.min((performance.now()-$)/F,1),z=W<.5?2*W*W:-1+(4-2*W)*W;o(s,Q+(j-Q)*z),W<1?f.current=requestAnimationFrame(H):f.current=null};f.current=requestAnimationFrame(H)},[o,s,A,e,n]),D=te.useCallback(V=>{!p.current||!o||(f.current&&(cancelAnimationFrame(f.current),f.current=null),o(s,A(V)))},[o,s,A]),B=te.useCallback(()=>{p.current=!1},[]),L=!!o;return x.jsxs("svg",{ref:h,width:88,height:88,style:{flexShrink:0,cursor:L?"crosshair":"default",touchAction:"none"},onPointerDown:L?S:void 0,onPointerMove:L?D:void 0,onPointerUp:L?B:void 0,children:[L&&x.jsx("circle",{cx:44,cy:44,r:44,fill:"transparent"}),x.jsx("path",{d:v(-_,_),fill:"none",stroke:g,strokeWidth:"5",strokeLinecap:"round"}),x.jsx("circle",{cx:44+36*Math.cos((-_-90)*Math.PI/180),cy:44+36*Math.sin((-_-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),x.jsx("circle",{cx:44+36*Math.cos((_-90)*Math.PI/180),cy:44+36*Math.sin((_-90)*Math.PI/180),r:"3",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.5"}),x.jsx("line",{x1:44,y1:12,x2:44,y2:19,stroke:(r==null?void 0:r.main)??"#0088ff",strokeWidth:"2",opacity:"0.7"}),Math.abs(T)>.5&&x.jsx("path",{d:v(0,T,T>=0?1:0),fill:"none",stroke:y,strokeWidth:"4.5",strokeLinecap:"round",style:{filter:i?"none":`drop-shadow(0 0 4px ${y}88)`}}),x.jsx("circle",{cx:E,cy:P,r:L?6:4.5,fill:m,style:{filter:`drop-shadow(0 0 5px ${m})`}}),x.jsxs("text",{x:44,y:49,textAnchor:"middle",fontSize:"10",fontFamily:"monospace",fill:(r==null?void 0:r.main)??"#0088ff",opacity:"0.85",children:[(180+T).toFixed(0),"°"]})]})}function fS({velocity:n}){const e=Math.abs(n),t=n>=0?"→":"←",i=Math.min(e/5,1),r=Math.round(i*5),s=e>3?"#ffaa00":"#00aaff";return x.jsxs("div",{className:"vel-arrow",children:[x.jsx("span",{className:"vel-dir",style:{color:s},children:t}),x.jsx("span",{className:"vel-bars",children:Array.from({length:5},(o,a)=>x.jsx("span",{className:"vel-bar",style:{opacity:a<r?1:.15,background:s}},a))})]})}function hS({joint:n,index:e,rawAngle:t,onArcDrag:i,onJointHome:r,onJointSet:s,collision:o=!1}){const{angle:a=0,velocity:l=0,acceleration:c=0,limitHit:u=!1}=n??{},h=yt[e],p=Op[e]??Op[1],f=(h==null?void 0:h.type)==="twist",g=(h==null?void 0:h.limit)??Math.PI,y=(h==null?void 0:h.label)??`JOINT ${e+1}`;return x.jsxs("div",{className:`joint-card ${u?"limit-hit":""} ${o?"collision-hit":""}`,style:{"--joint-color":p.main,"--joint-glow":p.glow},children:[x.jsx("div",{className:"joint-accent"}),x.jsxs("div",{className:"joint-header",children:[x.jsx("span",{className:"joint-label",style:{color:p.main},children:y}),x.jsxs("div",{className:"joint-header-right",children:[o&&x.jsx("span",{className:"collision-badge",children:"COLL"}),u&&!f&&x.jsx("span",{className:"limit-badge",children:"LIMIT"}),r&&x.jsx("button",{className:"joint-home-btn",onClick:()=>r(e),title:`Reset ${y} to home (180°)`,style:{"--joint-color":p.main},children:"↺"})]})]}),x.jsxs("div",{className:"joint-body",children:[x.jsx(dS,{angle:a,rawAngle:t,limit:g,limitHit:u&&!f,palette:p,panelIdx:e,onDrag:i}),x.jsxs("div",{className:"joint-stats",children:[x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"ANG"}),x.jsx(uS,{rawAngle:t??a,palette:p,panelIdx:e,limit:g,onJointSet:s})]}),x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"VEL"}),x.jsxs("div",{className:"stat-val-group",children:[x.jsx(kp,{value:l*da,format:m=>`${Math.abs(m).toFixed(1)}°/s`,className:"stat-val"}),x.jsx(fS,{velocity:l})]})]}),x.jsxs("div",{className:"stat-row",children:[x.jsx("span",{className:"stat-key",children:"ACC"}),x.jsx(kp,{value:c*da,format:m=>`${m>=0?"+":""}${m.toFixed(0)}°/s²`,className:`stat-val ${Math.abs(c)>5?"accent":""}`})]})]})]})]})}function pS({style:n}){var W,z,re,K,k;const e=ct(I=>I.joints),t=ct(I=>I.activeRootId),i=ct(I=>I.jointAngles),r=ct(I=>I.homeArm),s=ct(I=>I.setJointAngle),o=ct(I=>I.collision),a=Re(I=>I.modules),l=Re(I=>I.activeModuleId),c=Re(I=>I.setActiveModule),u=Re(I=>I.addModule);Re(I=>I.removeModule);const h=Re(I=>I.deleteMode),p=Re(I=>I.setDeleteMode),f=Re(I=>I.connectMode),g=Re(I=>I.setConnectMode),y=Re(I=>I.face1),m=Re(I=>I.face2),d=Re(I=>I.connectError),v=Re(I=>I.clearFaces),_=Re(I=>I.disconnectMode),M=Re(I=>I.setDisconnectMode),T=Re(I=>I.dSel1),b=Re(I=>I.dSel2),E=Re(I=>I.disconnectError),P=Re(I=>I.clearDSelections),A=Zn.indexOf(t),S=I=>A>I?-1:1,D=((W=a.find(I=>I.id===l))==null?void 0:W.label)??"Module 1",B=()=>{var ee;if(!window.confirm("Start a new project? The current scene will be cleared (saved files are untouched)."))return;const I={format:"tetrobot-project",version:1,scene:{activeModuleId:"module-0",nextId:1,modules:[{id:"module-0",label:"Module 1",angles:[0,0,0,0,0,0],activeRootId:"R1",position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1},mode:"horizontal"}],welds:[]}},ne=(ee=oe.loadScene)==null?void 0:ee.call(oe,I);if(ne&&!ne.ok){alert(ne.error);return}zn.getState().setDoc(null,null)},L=async()=>{const I=await l_(Jf(),"tetrobot.nischay");I&&zn.getState().setDoc(I.name,I.handle)},V=async()=>{var I;try{const ne=await c_();if(!ne)return;const ee=(I=oe.loadScene)==null?void 0:I.call(oe,ne.data);if(ee&&!ee.ok){alert(`Could not open project: ${ee.error}`);return}zn.getState().setDoc(ne.name,ne.handle)}catch(ne){alert(`Could not open file: ${ne.message}`)}},[j,Q]=te.useState(!1),[$,F]=te.useState(!1),H=I=>{var ee;const ne=(ee=oe.exportModel)==null?void 0:ee.call(oe,I);if(ne&&!ne.ok){alert(ne.error);return}Q(!1)};return x.jsxs("aside",{className:"left-panel fade-in",style:n,children:[x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"PROJECT"}),x.jsxs("div",{className:"lp-icon-row",children:[x.jsx("button",{className:"lp-icon-btn",onClick:B,title:"New project",children:x.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("path",{d:"M9 2H4v12h8V5L9 2z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"}),x.jsx("path",{d:"M8 7.5v3M6.5 9h3",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"})]})}),x.jsx("button",{className:"lp-icon-btn",onClick:V,title:"Open project (.nischay)",children:x.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M2 4h4l1.5 1.5H14V13H2V4z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"})})}),x.jsx("button",{className:"lp-icon-btn",onClick:L,title:"Save project (.nischay)",children:x.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("path",{d:"M3 2h8l3 3v9H3V2z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"}),x.jsx("path",{d:"M5 2v4h5V2M5 14v-4h6v4",stroke:"currentColor",strokeWidth:"1.2",strokeLinejoin:"round"})]})}),x.jsx("button",{className:"lp-icon-btn",onClick:()=>Q(!0),title:"Export model (OBJ / STL / STEP / GLB)",children:x.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M8 2v8M8 10l-3-3M8 10l3-3M3 13h10",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round",strokeLinejoin:"round"})})})]})]}),j&&x.jsx("div",{className:"export-modal-backdrop",onClick:()=>Q(!1),children:x.jsxs("div",{className:"export-modal",onClick:I=>I.stopPropagation(),children:[x.jsx("div",{className:"export-modal-title",children:"EXPORT AS"}),x.jsxs("button",{className:"export-opt",onClick:()=>H("obj"),children:["OBJ ",x.jsx("small",{children:"mesh + materials"})]}),x.jsxs("button",{className:"export-opt",onClick:()=>H("stl"),children:["STL ",x.jsx("small",{children:"mesh only · 3D print"})]}),x.jsxs("button",{className:"export-opt export-opt--soft",onClick:()=>H("step"),children:["STEP ",x.jsx("small",{children:"CAD · not supported yet"})]}),x.jsxs("button",{className:"export-opt",onClick:()=>H("glb"),children:["GLB ",x.jsx("small",{children:"Blender / 3D viewers"})]}),x.jsx("button",{className:"export-cancel",onClick:()=>Q(!1),children:"Cancel"})]})}),a.length>1&&x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"ACTIVE MODULE"}),x.jsx("select",{className:"module-select",value:l,onChange:I=>c(I.target.value),children:a.map(I=>x.jsx("option",{value:I.id,children:I.label},I.id))})]}),x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"MODULE"}),x.jsxs("div",{className:"lp-icon-row",children:[x.jsx("button",{className:"lp-icon-btn",onClick:()=>{var I;return u((I=oe.computeFreeSpawn)==null?void 0:I.call(oe))},title:"Add module",children:x.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M8 2v12M2 8h12",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round"})})}),x.jsx("button",{className:`lp-icon-btn${f?" lp-icon-btn--active":""}`,onClick:()=>{g(!f),_&&M(!1)},title:f?"Cancel connect":"Connect modules",children:x.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M5 8h6",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeDasharray:"2 1.5"})]})}),x.jsx("button",{className:`lp-icon-btn${_?" lp-icon-btn--active lp-icon-btn--danger":""}`,onClick:()=>{M(!_),f&&g(!1)},title:_?"Cancel disconnect":"Disconnect modules",children:x.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"3",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("circle",{cx:"13",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M5.5 6.5l5-3M5.5 9.5l5 3",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]})}),x.jsx("button",{className:`lp-icon-btn lp-icon-btn--danger${h?" lp-icon-btn--active":""}`,onClick:()=>p(!h),disabled:a.length<=1,title:a.length<=1?"At least one module required":h?"Cancel delete":"Delete module",children:x.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})})})]})]}),h&&x.jsxs("div",{className:"section connect-status disconnect-status",children:[x.jsx("div",{className:"section-title",children:"DELETE MODULE"}),x.jsx("p",{className:"connect-hint",children:"Click on any part of the module you want to delete in the 3D viewport."})]}),f&&x.jsxs("div",{className:"section connect-status",children:[x.jsx("div",{className:"section-title",children:"FACE SELECTION"}),x.jsx("p",{className:"connect-hint",children:"Click a square end-face on a module to select it. Two faces from different modules will join them."}),x.jsxs("div",{className:"face-slots",children:[x.jsxs("div",{className:`face-slot face-slot--1${y?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"FACE A"}),x.jsx("span",{className:"face-slot-value",children:y?`${((z=a.find(I=>I.id===y.moduleId))==null?void 0:z.label)??"?"} · ${y.faceKey}`:"not selected"})]}),x.jsxs("div",{className:`face-slot face-slot--2${m?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"FACE B"}),x.jsx("span",{className:"face-slot-value",children:m?`${((re=a.find(I=>I.id===m.moduleId))==null?void 0:re.label)??"?"} · ${m.faceKey}`:"not selected"})]})]}),d&&x.jsx("div",{className:"connect-error",children:d}),y&&x.jsx("button",{className:"clear-faces-btn",onClick:v,children:"CLEAR SELECTION"})]}),_&&x.jsxs("div",{className:"section connect-status disconnect-status",children:[x.jsx("div",{className:"section-title",children:"DISCONNECT SELECTION"}),x.jsx("p",{className:"connect-hint",children:"Click on any part of a module to select it. Select two different modules to separate them."}),x.jsxs("div",{className:"face-slots",children:[x.jsxs("div",{className:`face-slot face-slot--1${T?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"MOD A"}),x.jsx("span",{className:"face-slot-value",children:T?((K=a.find(I=>I.id===T))==null?void 0:K.label)??"?":"not selected"})]}),x.jsxs("div",{className:`face-slot face-slot--2${b?" face-slot--set":""}`,children:[x.jsx("span",{className:"face-slot-label",children:"MOD B"}),x.jsx("span",{className:"face-slot-value",children:b?((k=a.find(I=>I.id===b))==null?void 0:k.label)??"?":"not selected"})]})]}),E&&x.jsx("div",{className:"connect-error",children:E}),T&&!b&&x.jsx("button",{className:"clear-faces-btn",onClick:P,children:"CLEAR SELECTION"})]}),x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:D}),x.jsxs("button",{className:"home-btn",onClick:r,title:"Reset arm to home position",children:[x.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 20 20",fill:"none",children:[x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"}),x.jsx("rect",{x:"8",y:"12",width:"4",height:"6",rx:"0.5",stroke:"currentColor",strokeWidth:"1.5",fill:"none"})]}),"HOME"]})]}),x.jsxs("div",{className:"section",children:[x.jsx("div",{className:"section-title",children:"FIXED ROOTS"}),x.jsx("div",{className:"root-grid",children:a.map((I,ne)=>{const ee=I.id===l?t:I.activeRootId,pe=I.id===l;return x.jsxs("button",{className:`root-chip${pe?" root-chip--active":""}`,onClick:()=>c(I.id),title:`${I.label} — root ${ee}${pe?" (active)":""}`,children:[x.jsx("span",{className:"root-chip-dot"}),ee,"-M",ne+1]},I.id)})}),x.jsx("p",{className:"root-hint",children:"Click a rod in the viewport to set the active module’s root. Click a chip to switch active module."})]}),x.jsxs("div",{className:"section",children:[x.jsxs("button",{className:"section-collapse",onClick:()=>F(I=>!I),children:[x.jsx("span",{className:"section-title",children:"JOINT TELEMETRY"}),x.jsx("span",{className:`collapse-arrow${$?" open":""}`,children:"▸"})]}),$&&x.jsx("div",{className:"joint-list",children:e.map((I,ne)=>x.jsx(hS,{joint:{...I,angle:I.angle*S(ne),velocity:I.velocity*S(ne),acceleration:I.acceleration*S(ne)},index:ne,rawAngle:i[ne]*S(ne),onArcDrag:(ee,pe)=>s(ee,pe*S(ee)),onJointHome:ee=>s(ee,0),onJointSet:(ee,pe)=>s(ee,pe*S(ee)),collision:o},ne))})]}),x.jsxs("div",{className:"instructions",children:[x.jsx("div",{className:"section-title",children:"CONTROLS"}),x.jsxs("ul",{children:[x.jsxs("li",{children:[x.jsx("kbd",{children:"Drag"})," any rod → arm follows cursor (IK)"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Click"})," a rod → set it as fixed root"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Connect"})," CONNECT MODULES, then click 2 faces"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Linked"})," drag a joined module → whole unit moves"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Arc"})," drag in a joint card to set its angle"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"ANG"})," type degrees, press Enter"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"Scroll"})," zoom · ",x.jsx("kbd",{children:"RMB"})," orbit"]}),x.jsxs("li",{children:[x.jsx("kbd",{children:"MMB"})," / ",x.jsx("kbd",{children:"Shift+Drag"})," pan"]})]})]}),x.jsxs("div",{className:"panel-footer",children:[x.jsx("span",{children:"BEND 80–280°"}),x.jsx("span",{children:"TWIST 0–360°"}),x.jsxs("span",{children:[a.length," MODULE",a.length>1?"S":""," · 6 JOINTS"]})]})]})}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const bc="164",Pr={ROTATE:0,DOLLY:1,PAN:2},Kr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},mS=0,zp=1,gS=2,d_=1,f_=2,yi=3,hr=0,hn=1,Un=2,Ci=0,ks=1,qd=2,Bp=3,Hp=4,vS=5,Lr=100,_S=101,xS=102,yS=103,MS=104,SS=200,ES=201,wS=202,TS=203,Kd=204,Zd=205,AS=206,bS=207,CS=208,RS=209,PS=210,NS=211,LS=212,IS=213,DS=214,US=0,FS=1,OS=2,Ql=3,kS=4,zS=5,BS=6,HS=7,h_=0,VS=1,jS=2,cr=0,p_=1,m_=2,g_=3,eh=4,GS=5,v_=6,__=7,x_=300,qs=301,Ks=302,Jd=303,Qd=304,Cc=306,ec=1e3,Ji=1001,tc=1002,Sn=1003,y_=1004,Lo=1005,Fn=1006,Tl=1007,Qi=1008,pr=1009,WS=1010,XS=1011,M_=1012,S_=1013,Zs=1014,er=1015,ur=1016,E_=1017,w_=1018,ya=1020,$S=35902,YS=1021,qS=1022,Jn=1023,KS=1024,ZS=1025,zs=1026,fa=1027,JS=1028,T_=1029,QS=1030,A_=1031,b_=1033,cu=33776,uu=33777,du=33778,fu=33779,Vp=35840,jp=35841,Gp=35842,Wp=35843,Xp=36196,$p=37492,Yp=37496,qp=37808,Kp=37809,Zp=37810,Jp=37811,Qp=37812,em=37813,tm=37814,nm=37815,im=37816,rm=37817,sm=37818,om=37819,am=37820,lm=37821,hu=36492,cm=36494,um=36495,eE=36283,dm=36284,fm=36285,hm=36286,tE=2300,nE=2301,iE=3200,rE=3201,C_=0,sE=1,Ei="",_n="srgb",yr="srgb-linear",th="display-p3",Rc="display-p3-linear",nc="linear",lt="srgb",ic="rec709",rc="p3",Zr=7680,pm=519,oE=512,aE=513,lE=514,R_=515,cE=516,uE=517,dE=518,fE=519,mm=35044,gm="300 es",Ai=2e3,sc=2001;class $r{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let vm=1234567;const Wo=Math.PI/180,ha=180/Math.PI;function so(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(qt[n&255]+qt[n>>8&255]+qt[n>>16&255]+qt[n>>24&255]+"-"+qt[e&255]+qt[e>>8&255]+"-"+qt[e>>16&15|64]+qt[e>>24&255]+"-"+qt[t&63|128]+qt[t>>8&255]+"-"+qt[t>>16&255]+qt[t>>24&255]+qt[i&255]+qt[i>>8&255]+qt[i>>16&255]+qt[i>>24&255]).toLowerCase()}function Jt(n,e,t){return Math.max(e,Math.min(t,n))}function nh(n,e){return(n%e+e)%e}function hE(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function pE(n,e,t){return n!==e?(t-n)/(e-n):0}function Xo(n,e,t){return(1-t)*n+t*e}function mE(n,e,t,i){return Xo(n,e,1-Math.exp(-t*i))}function gE(n,e=1){return e-Math.abs(nh(n,e*2)-e)}function vE(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function _E(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function xE(n,e){return n+Math.floor(Math.random()*(e-n+1))}function yE(n,e){return n+Math.random()*(e-n)}function ME(n){return n*(.5-Math.random())}function SE(n){n!==void 0&&(vm=n);let e=vm+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function EE(n){return n*Wo}function wE(n){return n*ha}function TE(n){return(n&n-1)===0&&n!==0}function AE(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function bE(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function CE(n,e,t,i,r){const s=Math.cos,o=Math.sin,a=s(t/2),l=o(t/2),c=s((e+i)/2),u=o((e+i)/2),h=s((e-i)/2),p=o((e-i)/2),f=s((i-e)/2),g=o((i-e)/2);switch(r){case"XYX":n.set(a*u,l*h,l*p,a*c);break;case"YZY":n.set(l*p,a*u,l*h,a*c);break;case"ZXZ":n.set(l*h,l*p,a*u,a*c);break;case"XZX":n.set(a*u,l*g,l*f,a*c);break;case"YXY":n.set(l*f,a*u,l*g,a*c);break;case"ZYZ":n.set(l*g,l*f,a*u,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function vs(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function tn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Js={DEG2RAD:Wo,RAD2DEG:ha,generateUUID:so,clamp:Jt,euclideanModulo:nh,mapLinear:hE,inverseLerp:pE,lerp:Xo,damp:mE,pingpong:gE,smoothstep:vE,smootherstep:_E,randInt:xE,randFloat:yE,randFloatSpread:ME,seededRandom:SE,degToRad:EE,radToDeg:wE,isPowerOfTwo:TE,ceilPowerOfTwo:AE,floorPowerOfTwo:bE,setQuaternionFromProperEuler:CE,normalize:tn,denormalize:vs};class we{constructor(e=0,t=0){we.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Jt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Be{constructor(e,t,i,r,s,o,a,l,c){Be.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c)}set(e,t,i,r,s,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=l,u[6]=i,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],u=i[4],h=i[7],p=i[2],f=i[5],g=i[8],y=r[0],m=r[3],d=r[6],v=r[1],_=r[4],M=r[7],T=r[2],b=r[5],E=r[8];return s[0]=o*y+a*v+l*T,s[3]=o*m+a*_+l*b,s[6]=o*d+a*M+l*E,s[1]=c*y+u*v+h*T,s[4]=c*m+u*_+h*b,s[7]=c*d+u*M+h*E,s[2]=p*y+f*v+g*T,s[5]=p*m+f*_+g*b,s[8]=p*d+f*M+g*E,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-i*s*u+i*a*l+r*s*c-r*o*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=u*o-a*c,p=a*l-u*s,f=c*s-o*l,g=t*h+i*p+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const y=1/g;return e[0]=h*y,e[1]=(r*c-u*i)*y,e[2]=(a*i-r*o)*y,e[3]=p*y,e[4]=(u*t-r*l)*y,e[5]=(r*s-a*t)*y,e[6]=f*y,e[7]=(i*l-c*t)*y,e[8]=(o*t-i*s)*y,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(pu.makeScale(e,t)),this}rotate(e){return this.premultiply(pu.makeRotation(-e)),this}translate(e,t){return this.premultiply(pu.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const pu=new Be;function P_(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function oc(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function RE(){const n=oc("canvas");return n.style.display="block",n}const _m={};function PE(n){n in _m||(_m[n]=!0,console.warn(n))}const xm=new Be().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),ym=new Be().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Ba={[yr]:{transfer:nc,primaries:ic,toReference:n=>n,fromReference:n=>n},[_n]:{transfer:lt,primaries:ic,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[Rc]:{transfer:nc,primaries:rc,toReference:n=>n.applyMatrix3(ym),fromReference:n=>n.applyMatrix3(xm)},[th]:{transfer:lt,primaries:rc,toReference:n=>n.convertSRGBToLinear().applyMatrix3(ym),fromReference:n=>n.applyMatrix3(xm).convertLinearToSRGB()}},NE=new Set([yr,Rc]),st={enabled:!0,_workingColorSpace:yr,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!NE.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;const i=Ba[e].toReference,r=Ba[t].fromReference;return r(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return Ba[n].primaries},getTransfer:function(n){return n===Ei?nc:Ba[n].transfer}};function Bs(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function mu(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Jr;class LE{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Jr===void 0&&(Jr=oc("canvas")),Jr.width=e.width,Jr.height=e.height;const i=Jr.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=Jr}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=oc("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Bs(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Bs(t[i]/255)*255):t[i]=Bs(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let IE=0;class ih{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:IE++}),this.uuid=so(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(gu(r[o].image)):s.push(gu(r[o]))}else s=gu(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function gu(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?LE.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let DE=0;class Qt extends $r{constructor(e=Qt.DEFAULT_IMAGE,t=Qt.DEFAULT_MAPPING,i=Ji,r=Ji,s=Fn,o=Qi,a=Jn,l=pr,c=Qt.DEFAULT_ANISOTROPY,u=Ei){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:DE++}),this.uuid=so(),this.name="",this.source=new ih(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Be,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==x_)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ec:e.x=e.x-Math.floor(e.x);break;case Ji:e.x=e.x<0?0:1;break;case tc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ec:e.y=e.y-Math.floor(e.y);break;case Ji:e.y=e.y<0?0:1;break;case tc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Qt.DEFAULT_IMAGE=null;Qt.DEFAULT_MAPPING=x_;Qt.DEFAULT_ANISOTROPY=1;class Ut{constructor(e=0,t=0,i=0,r=1){Ut.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],u=l[4],h=l[8],p=l[1],f=l[5],g=l[9],y=l[2],m=l[6],d=l[10];if(Math.abs(u-p)<.01&&Math.abs(h-y)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+p)<.1&&Math.abs(h+y)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,M=(f+1)/2,T=(d+1)/2,b=(u+p)/4,E=(h+y)/4,P=(g+m)/4;return _>M&&_>T?_<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(_),r=b/i,s=E/i):M>T?M<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(M),i=b/r,s=P/r):T<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(T),i=E/s,r=P/s),this.set(i,r,s,t),this}let v=Math.sqrt((m-g)*(m-g)+(h-y)*(h-y)+(p-u)*(p-u));return Math.abs(v)<.001&&(v=1),this.x=(m-g)/v,this.y=(h-y)/v,this.z=(p-u)/v,this.w=Math.acos((c+f+d-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class UE extends $r{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Ut(0,0,e,t),this.scissorTest=!1,this.viewport=new Ut(0,0,e,t);const r={width:e,height:t,depth:1};i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Fn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},i);const s=new Qt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace);s.flipY=!1,s.generateMipmaps=i.generateMipmaps,s.internalFormat=i.internalFormat,this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let i=0,r=e.textures.length;i<r;i++)this.textures[i]=e.textures[i].clone(),this.textures[i].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new ih(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ti extends UE{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class N_ extends Qt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Sn,this.minFilter=Sn,this.wrapR=Ji,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class FE extends Qt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Sn,this.minFilter=Sn,this.wrapR=Ji,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Bt{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let l=i[r+0],c=i[r+1],u=i[r+2],h=i[r+3];const p=s[o+0],f=s[o+1],g=s[o+2],y=s[o+3];if(a===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h;return}if(a===1){e[t+0]=p,e[t+1]=f,e[t+2]=g,e[t+3]=y;return}if(h!==y||l!==p||c!==f||u!==g){let m=1-a;const d=l*p+c*f+u*g+h*y,v=d>=0?1:-1,_=1-d*d;if(_>Number.EPSILON){const T=Math.sqrt(_),b=Math.atan2(T,d*v);m=Math.sin(m*b)/T,a=Math.sin(a*b)/T}const M=a*v;if(l=l*m+p*M,c=c*m+f*M,u=u*m+g*M,h=h*m+y*M,m===1-a){const T=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=T,c*=T,u*=T,h*=T}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,i,r,s,o){const a=i[r],l=i[r+1],c=i[r+2],u=i[r+3],h=s[o],p=s[o+1],f=s[o+2],g=s[o+3];return e[t]=a*g+u*h+l*f-c*p,e[t+1]=l*g+u*p+c*h-a*f,e[t+2]=c*g+u*f+a*p-l*h,e[t+3]=u*g-a*h-l*p-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),u=a(r/2),h=a(s/2),p=l(i/2),f=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=p*u*h+c*f*g,this._y=c*f*h-p*u*g,this._z=c*u*g+p*f*h,this._w=c*u*h-p*f*g;break;case"YXZ":this._x=p*u*h+c*f*g,this._y=c*f*h-p*u*g,this._z=c*u*g-p*f*h,this._w=c*u*h+p*f*g;break;case"ZXY":this._x=p*u*h-c*f*g,this._y=c*f*h+p*u*g,this._z=c*u*g+p*f*h,this._w=c*u*h-p*f*g;break;case"ZYX":this._x=p*u*h-c*f*g,this._y=c*f*h+p*u*g,this._z=c*u*g-p*f*h,this._w=c*u*h+p*f*g;break;case"YZX":this._x=p*u*h+c*f*g,this._y=c*f*h+p*u*g,this._z=c*u*g-p*f*h,this._w=c*u*h-p*f*g;break;case"XZY":this._x=p*u*h-c*f*g,this._y=c*f*h-p*u*g,this._z=c*u*g+p*f*h,this._w=c*u*h+p*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],h=t[10],p=i+a+h;if(p>0){const f=.5/Math.sqrt(p+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(o-r)*f}else if(i>a&&i>h){const f=2*Math.sqrt(1+i-a-h);this._w=(u-l)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+c)/f}else if(a>h){const f=2*Math.sqrt(1+a-i-h);this._w=(s-c)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(l+u)/f}else{const f=2*Math.sqrt(1+h-i-a);this._w=(o-r)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Jt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+o*a+r*c-s*l,this._y=r*u+o*l+s*a-i*c,this._z=s*u+o*c+i*l-r*a,this._w=o*u-i*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-t;return this._w=f*o+t*this._w,this._x=f*i+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,a),h=Math.sin((1-t)*u)/c,p=Math.sin(t*u)/c;return this._w=o*h+this._w*p,this._x=i*h+this._x*p,this._y=r*h+this._y*p,this._z=s*h+this._z*p,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class O{constructor(e=0,t=0,i=0){O.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Mm.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Mm.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*i),u=2*(a*t-s*r),h=2*(s*i-o*t);return this.x=t+l*c+o*h-a*u,this.y=i+l*u+a*c-s*h,this.z=r+l*h+s*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=r*l-s*a,this.y=s*o-i*l,this.z=i*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return vu.copy(this).projectOnVector(e),this.sub(vu)}reflect(e){return this.sub(vu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Jt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const vu=new O,Mm=new Bt;class Dn{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Gn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Gn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Gn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Gn):Gn.fromBufferAttribute(s,o),Gn.applyMatrix4(e.matrixWorld),this.expandByPoint(Gn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ha.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ha.copy(i.boundingBox)),Ha.applyMatrix4(e.matrixWorld),this.union(Ha)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Gn),Gn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(yo),Va.subVectors(this.max,yo),Qr.subVectors(e.a,yo),es.subVectors(e.b,yo),ts.subVectors(e.c,yo),zi.subVectors(es,Qr),Bi.subVectors(ts,es),Sr.subVectors(Qr,ts);let t=[0,-zi.z,zi.y,0,-Bi.z,Bi.y,0,-Sr.z,Sr.y,zi.z,0,-zi.x,Bi.z,0,-Bi.x,Sr.z,0,-Sr.x,-zi.y,zi.x,0,-Bi.y,Bi.x,0,-Sr.y,Sr.x,0];return!_u(t,Qr,es,ts,Va)||(t=[1,0,0,0,1,0,0,0,1],!_u(t,Qr,es,ts,Va))?!1:(ja.crossVectors(zi,Bi),t=[ja.x,ja.y,ja.z],_u(t,Qr,es,ts,Va))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Gn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Gn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(pi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),pi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),pi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),pi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),pi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),pi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),pi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),pi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(pi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const pi=[new O,new O,new O,new O,new O,new O,new O,new O],Gn=new O,Ha=new Dn,Qr=new O,es=new O,ts=new O,zi=new O,Bi=new O,Sr=new O,yo=new O,Va=new O,ja=new O,Er=new O;function _u(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){Er.fromArray(n,s);const a=r.x*Math.abs(Er.x)+r.y*Math.abs(Er.y)+r.z*Math.abs(Er.z),l=e.dot(Er),c=t.dot(Er),u=i.dot(Er);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const OE=new Dn,Mo=new O,xu=new O;class rh{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):OE.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Mo.subVectors(e,this.center);const t=Mo.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Mo,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(xu.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Mo.copy(e.center).add(xu)),this.expandByPoint(Mo.copy(e.center).sub(xu))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const mi=new O,yu=new O,Ga=new O,Hi=new O,Mu=new O,Wa=new O,Su=new O;class sh{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,mi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=mi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(mi.copy(this.origin).addScaledVector(this.direction,t),mi.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){yu.copy(e).add(t).multiplyScalar(.5),Ga.copy(t).sub(e).normalize(),Hi.copy(this.origin).sub(yu);const s=e.distanceTo(t)*.5,o=-this.direction.dot(Ga),a=Hi.dot(this.direction),l=-Hi.dot(Ga),c=Hi.lengthSq(),u=Math.abs(1-o*o);let h,p,f,g;if(u>0)if(h=o*l-a,p=o*a-l,g=s*u,h>=0)if(p>=-g)if(p<=g){const y=1/u;h*=y,p*=y,f=h*(h+o*p+2*a)+p*(o*h+p+2*l)+c}else p=s,h=Math.max(0,-(o*p+a)),f=-h*h+p*(p+2*l)+c;else p=-s,h=Math.max(0,-(o*p+a)),f=-h*h+p*(p+2*l)+c;else p<=-g?(h=Math.max(0,-(-o*s+a)),p=h>0?-s:Math.min(Math.max(-s,-l),s),f=-h*h+p*(p+2*l)+c):p<=g?(h=0,p=Math.min(Math.max(-s,-l),s),f=p*(p+2*l)+c):(h=Math.max(0,-(o*s+a)),p=h>0?s:Math.min(Math.max(-s,-l),s),f=-h*h+p*(p+2*l)+c);else p=o>0?-s:s,h=Math.max(0,-(o*p+a)),f=-h*h+p*(p+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(yu).addScaledVector(Ga,p),f}intersectSphere(e,t){mi.subVectors(e.center,this.origin);const i=mi.dot(this.direction),r=mi.dot(mi)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,p=this.origin;return c>=0?(i=(e.min.x-p.x)*c,r=(e.max.x-p.x)*c):(i=(e.max.x-p.x)*c,r=(e.min.x-p.x)*c),u>=0?(s=(e.min.y-p.y)*u,o=(e.max.y-p.y)*u):(s=(e.max.y-p.y)*u,o=(e.min.y-p.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(e.min.z-p.z)*h,l=(e.max.z-p.z)*h):(a=(e.max.z-p.z)*h,l=(e.min.z-p.z)*h),i>l||a>r)||((a>i||i!==i)&&(i=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,mi)!==null}intersectTriangle(e,t,i,r,s){Mu.subVectors(t,e),Wa.subVectors(i,e),Su.crossVectors(Mu,Wa);let o=this.direction.dot(Su),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Hi.subVectors(this.origin,e);const l=a*this.direction.dot(Wa.crossVectors(Hi,Wa));if(l<0)return null;const c=a*this.direction.dot(Mu.cross(Hi));if(c<0||l+c>o)return null;const u=-a*Hi.dot(Su);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Qe{constructor(e,t,i,r,s,o,a,l,c,u,h,p,f,g,y,m){Qe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,l,c,u,h,p,f,g,y,m)}set(e,t,i,r,s,o,a,l,c,u,h,p,f,g,y,m){const d=this.elements;return d[0]=e,d[4]=t,d[8]=i,d[12]=r,d[1]=s,d[5]=o,d[9]=a,d[13]=l,d[2]=c,d[6]=u,d[10]=h,d[14]=p,d[3]=f,d[7]=g,d[11]=y,d[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Qe().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/ns.setFromMatrixColumn(e,0).length(),s=1/ns.setFromMatrixColumn(e,1).length(),o=1/ns.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const p=o*u,f=o*h,g=a*u,y=a*h;t[0]=l*u,t[4]=-l*h,t[8]=c,t[1]=f+g*c,t[5]=p-y*c,t[9]=-a*l,t[2]=y-p*c,t[6]=g+f*c,t[10]=o*l}else if(e.order==="YXZ"){const p=l*u,f=l*h,g=c*u,y=c*h;t[0]=p+y*a,t[4]=g*a-f,t[8]=o*c,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=f*a-g,t[6]=y+p*a,t[10]=o*l}else if(e.order==="ZXY"){const p=l*u,f=l*h,g=c*u,y=c*h;t[0]=p-y*a,t[4]=-o*h,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*u,t[9]=y-p*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const p=o*u,f=o*h,g=a*u,y=a*h;t[0]=l*u,t[4]=g*c-f,t[8]=p*c+y,t[1]=l*h,t[5]=y*c+p,t[9]=f*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const p=o*l,f=o*c,g=a*l,y=a*c;t[0]=l*u,t[4]=y-p*h,t[8]=g*h+f,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=f*h+g,t[10]=p-y*h}else if(e.order==="XZY"){const p=o*l,f=o*c,g=a*l,y=a*c;t[0]=l*u,t[4]=-h,t[8]=c*u,t[1]=p*h+y,t[5]=o*u,t[9]=f*h-g,t[2]=g*h-f,t[6]=a*u,t[10]=y*h+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(kE,e,zE)}lookAt(e,t,i){const r=this.elements;return mn.subVectors(e,t),mn.lengthSq()===0&&(mn.z=1),mn.normalize(),Vi.crossVectors(i,mn),Vi.lengthSq()===0&&(Math.abs(i.z)===1?mn.x+=1e-4:mn.z+=1e-4,mn.normalize(),Vi.crossVectors(i,mn)),Vi.normalize(),Xa.crossVectors(mn,Vi),r[0]=Vi.x,r[4]=Xa.x,r[8]=mn.x,r[1]=Vi.y,r[5]=Xa.y,r[9]=mn.y,r[2]=Vi.z,r[6]=Xa.z,r[10]=mn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],u=i[1],h=i[5],p=i[9],f=i[13],g=i[2],y=i[6],m=i[10],d=i[14],v=i[3],_=i[7],M=i[11],T=i[15],b=r[0],E=r[4],P=r[8],A=r[12],S=r[1],D=r[5],B=r[9],L=r[13],V=r[2],j=r[6],Q=r[10],$=r[14],F=r[3],H=r[7],W=r[11],z=r[15];return s[0]=o*b+a*S+l*V+c*F,s[4]=o*E+a*D+l*j+c*H,s[8]=o*P+a*B+l*Q+c*W,s[12]=o*A+a*L+l*$+c*z,s[1]=u*b+h*S+p*V+f*F,s[5]=u*E+h*D+p*j+f*H,s[9]=u*P+h*B+p*Q+f*W,s[13]=u*A+h*L+p*$+f*z,s[2]=g*b+y*S+m*V+d*F,s[6]=g*E+y*D+m*j+d*H,s[10]=g*P+y*B+m*Q+d*W,s[14]=g*A+y*L+m*$+d*z,s[3]=v*b+_*S+M*V+T*F,s[7]=v*E+_*D+M*j+T*H,s[11]=v*P+_*B+M*Q+T*W,s[15]=v*A+_*L+M*$+T*z,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],h=e[6],p=e[10],f=e[14],g=e[3],y=e[7],m=e[11],d=e[15];return g*(+s*l*h-r*c*h-s*a*p+i*c*p+r*a*f-i*l*f)+y*(+t*l*f-t*c*p+s*o*p-r*o*f+r*c*u-s*l*u)+m*(+t*c*h-t*a*f-s*o*h+i*o*f+s*a*u-i*c*u)+d*(-r*a*u-t*l*h+t*a*p+r*o*h-i*o*p+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],p=e[10],f=e[11],g=e[12],y=e[13],m=e[14],d=e[15],v=h*m*c-y*p*c+y*l*f-a*m*f-h*l*d+a*p*d,_=g*p*c-u*m*c-g*l*f+o*m*f+u*l*d-o*p*d,M=u*y*c-g*h*c+g*a*f-o*y*f-u*a*d+o*h*d,T=g*h*l-u*y*l-g*a*p+o*y*p+u*a*m-o*h*m,b=t*v+i*_+r*M+s*T;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/b;return e[0]=v*E,e[1]=(y*p*s-h*m*s-y*r*f+i*m*f+h*r*d-i*p*d)*E,e[2]=(a*m*s-y*l*s+y*r*c-i*m*c-a*r*d+i*l*d)*E,e[3]=(h*l*s-a*p*s-h*r*c+i*p*c+a*r*f-i*l*f)*E,e[4]=_*E,e[5]=(u*m*s-g*p*s+g*r*f-t*m*f-u*r*d+t*p*d)*E,e[6]=(g*l*s-o*m*s-g*r*c+t*m*c+o*r*d-t*l*d)*E,e[7]=(o*p*s-u*l*s+u*r*c-t*p*c-o*r*f+t*l*f)*E,e[8]=M*E,e[9]=(g*h*s-u*y*s-g*i*f+t*y*f+u*i*d-t*h*d)*E,e[10]=(o*y*s-g*a*s+g*i*c-t*y*c-o*i*d+t*a*d)*E,e[11]=(u*a*s-o*h*s-u*i*c+t*h*c+o*i*f-t*a*f)*E,e[12]=T*E,e[13]=(u*y*r-g*h*r+g*i*p-t*y*p-u*i*m+t*h*m)*E,e[14]=(g*a*r-o*y*r-g*i*l+t*y*l+o*i*m-t*a*m)*E,e[15]=(o*h*r-u*a*r+u*i*l-t*h*l-o*i*p+t*a*p)*E,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,l=e.z,c=s*o,u=s*a;return this.set(c*o+i,c*a-r*l,c*l+r*a,0,c*a+r*l,u*a+i,u*l-r*o,0,c*l-r*a,u*l+r*o,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,u=o+o,h=a+a,p=s*c,f=s*u,g=s*h,y=o*u,m=o*h,d=a*h,v=l*c,_=l*u,M=l*h,T=i.x,b=i.y,E=i.z;return r[0]=(1-(y+d))*T,r[1]=(f+M)*T,r[2]=(g-_)*T,r[3]=0,r[4]=(f-M)*b,r[5]=(1-(p+d))*b,r[6]=(m+v)*b,r[7]=0,r[8]=(g+_)*E,r[9]=(m-v)*E,r[10]=(1-(p+y))*E,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=ns.set(r[0],r[1],r[2]).length();const o=ns.set(r[4],r[5],r[6]).length(),a=ns.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Wn.copy(this);const c=1/s,u=1/o,h=1/a;return Wn.elements[0]*=c,Wn.elements[1]*=c,Wn.elements[2]*=c,Wn.elements[4]*=u,Wn.elements[5]*=u,Wn.elements[6]*=u,Wn.elements[8]*=h,Wn.elements[9]*=h,Wn.elements[10]*=h,t.setFromRotationMatrix(Wn),i.x=s,i.y=o,i.z=a,this}makePerspective(e,t,i,r,s,o,a=Ai){const l=this.elements,c=2*s/(t-e),u=2*s/(i-r),h=(t+e)/(t-e),p=(i+r)/(i-r);let f,g;if(a===Ai)f=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===sc)f=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=u,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=Ai){const l=this.elements,c=1/(t-e),u=1/(i-r),h=1/(o-s),p=(t+e)*c,f=(i+r)*u;let g,y;if(a===Ai)g=(o+s)*h,y=-2*h;else if(a===sc)g=s*h,y=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-p,l[1]=0,l[5]=2*u,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=y,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const ns=new O,Wn=new Qe,kE=new O(0,0,0),zE=new O(1,1,1),Vi=new O,Xa=new O,mn=new O,Sm=new Qe,Em=new Bt;class di{constructor(e=0,t=0,i=0,r=di.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],u=r[9],h=r[2],p=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(Jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(p,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Jt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Jt(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Jt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(p,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(p,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Sm.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Sm,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Em.setFromEuler(this),this.setFromQuaternion(Em,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}di.DEFAULT_ORDER="XYZ";class oh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let BE=0;const wm=new O,is=new Bt,gi=new Qe,$a=new O,So=new O,HE=new O,VE=new Bt,Tm=new O(1,0,0),Am=new O(0,1,0),bm=new O(0,0,1),Cm={type:"added"},jE={type:"removed"},rs={type:"childadded",child:null},Eu={type:"childremoved",child:null};class Ot extends $r{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:BE++}),this.uuid=so(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ot.DEFAULT_UP.clone();const e=new O,t=new di,i=new Bt,r=new O(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Qe},normalMatrix:{value:new Be}}),this.matrix=new Qe,this.matrixWorld=new Qe,this.matrixAutoUpdate=Ot.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new oh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return is.setFromAxisAngle(e,t),this.quaternion.multiply(is),this}rotateOnWorldAxis(e,t){return is.setFromAxisAngle(e,t),this.quaternion.premultiply(is),this}rotateX(e){return this.rotateOnAxis(Tm,e)}rotateY(e){return this.rotateOnAxis(Am,e)}rotateZ(e){return this.rotateOnAxis(bm,e)}translateOnAxis(e,t){return wm.copy(e).applyQuaternion(this.quaternion),this.position.add(wm.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Tm,e)}translateY(e){return this.translateOnAxis(Am,e)}translateZ(e){return this.translateOnAxis(bm,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(gi.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?$a.copy(e):$a.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),So.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?gi.lookAt(So,$a,this.up):gi.lookAt($a,So,this.up),this.quaternion.setFromRotationMatrix(gi),r&&(gi.extractRotation(r.matrixWorld),is.setFromRotationMatrix(gi),this.quaternion.premultiply(is.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Cm),rs.child=e,this.dispatchEvent(rs),rs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(jE),Eu.child=e,this.dispatchEvent(Eu),Eu.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),gi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),gi.multiply(e.parent.matrixWorld)),e.applyMatrix4(gi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Cm),rs.child=e,this.dispatchEvent(rs),rs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(So,e,HE),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(So,VE,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++){const s=t[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++){const a=r[s];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(e.shapes,h)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),h=o(e.shapes),p=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),p.length>0&&(i.skeletons=p),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=r,i;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Ot.DEFAULT_UP=new O(0,1,0);Ot.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Xn=new O,vi=new O,wu=new O,_i=new O,ss=new O,os=new O,Rm=new O,Tu=new O,Au=new O,bu=new O;class li{constructor(e=new O,t=new O,i=new O){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Xn.subVectors(e,t),r.cross(Xn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Xn.subVectors(r,t),vi.subVectors(i,t),wu.subVectors(e,t);const o=Xn.dot(Xn),a=Xn.dot(vi),l=Xn.dot(wu),c=vi.dot(vi),u=vi.dot(wu),h=o*c-a*a;if(h===0)return s.set(0,0,0),null;const p=1/h,f=(c*l-a*u)*p,g=(o*u-a*l)*p;return s.set(1-f-g,g,f)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,_i)===null?!1:_i.x>=0&&_i.y>=0&&_i.x+_i.y<=1}static getInterpolation(e,t,i,r,s,o,a,l){return this.getBarycoord(e,t,i,r,_i)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,_i.x),l.addScaledVector(o,_i.y),l.addScaledVector(a,_i.z),l)}static isFrontFacing(e,t,i,r){return Xn.subVectors(i,t),vi.subVectors(e,t),Xn.cross(vi).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Xn.subVectors(this.c,this.b),vi.subVectors(this.a,this.b),Xn.cross(vi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return li.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return li.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return li.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return li.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return li.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let o,a;ss.subVectors(r,i),os.subVectors(s,i),Tu.subVectors(e,i);const l=ss.dot(Tu),c=os.dot(Tu);if(l<=0&&c<=0)return t.copy(i);Au.subVectors(e,r);const u=ss.dot(Au),h=os.dot(Au);if(u>=0&&h<=u)return t.copy(r);const p=l*h-u*c;if(p<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(i).addScaledVector(ss,o);bu.subVectors(e,s);const f=ss.dot(bu),g=os.dot(bu);if(g>=0&&f<=g)return t.copy(s);const y=f*c-l*g;if(y<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(i).addScaledVector(os,a);const m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return Rm.subVectors(s,r),a=(h-u)/(h-u+(f-g)),t.copy(r).addScaledVector(Rm,a);const d=1/(m+y+p);return o=y*d,a=p*d,t.copy(i).addScaledVector(ss,o).addScaledVector(os,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const L_={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ji={h:0,s:0,l:0},Ya={h:0,s:0,l:0};function Cu(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class He{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=_n){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,st.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=st.workingColorSpace){return this.r=e,this.g=t,this.b=i,st.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=st.workingColorSpace){if(e=nh(e,1),t=Jt(t,0,1),i=Jt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=Cu(o,s,e+1/3),this.g=Cu(o,s,e),this.b=Cu(o,s,e-1/3)}return st.toWorkingColorSpace(this,r),this}setStyle(e,t=_n){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=_n){const i=L_[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Bs(e.r),this.g=Bs(e.g),this.b=Bs(e.b),this}copyLinearToSRGB(e){return this.r=mu(e.r),this.g=mu(e.g),this.b=mu(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=_n){return st.fromWorkingColorSpace(Kt.copy(this),e),Math.round(Jt(Kt.r*255,0,255))*65536+Math.round(Jt(Kt.g*255,0,255))*256+Math.round(Jt(Kt.b*255,0,255))}getHexString(e=_n){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=st.workingColorSpace){st.fromWorkingColorSpace(Kt.copy(this),t);const i=Kt.r,r=Kt.g,s=Kt.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const h=o-a;switch(c=u<=.5?h/(o+a):h/(2-o-a),o){case i:l=(r-s)/h+(r<s?6:0);break;case r:l=(s-i)/h+2;break;case s:l=(i-r)/h+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=st.workingColorSpace){return st.fromWorkingColorSpace(Kt.copy(this),t),e.r=Kt.r,e.g=Kt.g,e.b=Kt.b,e}getStyle(e=_n){st.fromWorkingColorSpace(Kt.copy(this),e);const t=Kt.r,i=Kt.g,r=Kt.b;return e!==_n?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(ji),this.setHSL(ji.h+e,ji.s+t,ji.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(ji),e.getHSL(Ya);const i=Xo(ji.h,Ya.h,t),r=Xo(ji.s,Ya.s,t),s=Xo(ji.l,Ya.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Kt=new He;He.NAMES=L_;let GE=0;class Ma extends $r{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:GE++}),this.uuid=so(),this.name="",this.type="Material",this.blending=ks,this.side=hr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Kd,this.blendDst=Zd,this.blendEquation=Lr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new He(0,0,0),this.blendAlpha=0,this.depthFunc=Ql,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=pm,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Zr,this.stencilZFail=Zr,this.stencilZPass=Zr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==ks&&(i.blending=this.blending),this.side!==hr&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Kd&&(i.blendSrc=this.blendSrc),this.blendDst!==Zd&&(i.blendDst=this.blendDst),this.blendEquation!==Lr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ql&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==pm&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Zr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Zr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Zr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Pc extends Ma{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new He(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new di,this.combine=h_,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Tt=new O,qa=new we;class Ht{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=mm,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=er,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return PE("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)qa.fromBufferAttribute(this,t),qa.applyMatrix3(e),this.setXY(t,qa.x,qa.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=vs(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=tn(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=vs(t,this.array)),t}setX(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=vs(t,this.array)),t}setY(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=vs(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=vs(t,this.array)),t}setW(e,t){return this.normalized&&(t=tn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=tn(t,this.array),i=tn(i,this.array),r=tn(r,this.array),s=tn(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==mm&&(e.usage=this.usage),e}}class I_ extends Ht{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class D_ extends Ht{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class kt extends Ht{constructor(e,t,i){super(new Float32Array(e),t,i)}}let WE=0;const Pn=new Qe,Ru=new Ot,as=new O,gn=new Dn,Eo=new Dn,It=new O;class ii extends $r{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:WE++}),this.uuid=so(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(P_(e)?D_:I_)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new Be().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Pn.makeRotationFromQuaternion(e),this.applyMatrix4(Pn),this}rotateX(e){return Pn.makeRotationX(e),this.applyMatrix4(Pn),this}rotateY(e){return Pn.makeRotationY(e),this.applyMatrix4(Pn),this}rotateZ(e){return Pn.makeRotationZ(e),this.applyMatrix4(Pn),this}translate(e,t,i){return Pn.makeTranslation(e,t,i),this.applyMatrix4(Pn),this}scale(e,t,i){return Pn.makeScale(e,t,i),this.applyMatrix4(Pn),this}lookAt(e){return Ru.lookAt(e),Ru.updateMatrix(),this.applyMatrix4(Ru.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(as).negate(),this.translate(as.x,as.y,as.z),this}setFromPoints(e){const t=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new kt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Dn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];gn.setFromBufferAttribute(s),this.morphTargetsRelative?(It.addVectors(this.boundingBox.min,gn.min),this.boundingBox.expandByPoint(It),It.addVectors(this.boundingBox.max,gn.max),this.boundingBox.expandByPoint(It)):(this.boundingBox.expandByPoint(gn.min),this.boundingBox.expandByPoint(gn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rh);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){const i=this.boundingSphere.center;if(gn.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Eo.setFromBufferAttribute(a),this.morphTargetsRelative?(It.addVectors(gn.min,Eo.min),gn.expandByPoint(It),It.addVectors(gn.max,Eo.max),gn.expandByPoint(It)):(gn.expandByPoint(Eo.min),gn.expandByPoint(Eo.max))}gn.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)It.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(It));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)It.fromBufferAttribute(a,c),l&&(as.fromBufferAttribute(e,c),It.add(as)),r=Math.max(r,i.distanceToSquared(It))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ht(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let P=0;P<i.count;P++)a[P]=new O,l[P]=new O;const c=new O,u=new O,h=new O,p=new we,f=new we,g=new we,y=new O,m=new O;function d(P,A,S){c.fromBufferAttribute(i,P),u.fromBufferAttribute(i,A),h.fromBufferAttribute(i,S),p.fromBufferAttribute(s,P),f.fromBufferAttribute(s,A),g.fromBufferAttribute(s,S),u.sub(c),h.sub(c),f.sub(p),g.sub(p);const D=1/(f.x*g.y-g.x*f.y);isFinite(D)&&(y.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(D),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(D),a[P].add(y),a[A].add(y),a[S].add(y),l[P].add(m),l[A].add(m),l[S].add(m))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let P=0,A=v.length;P<A;++P){const S=v[P],D=S.start,B=S.count;for(let L=D,V=D+B;L<V;L+=3)d(e.getX(L+0),e.getX(L+1),e.getX(L+2))}const _=new O,M=new O,T=new O,b=new O;function E(P){T.fromBufferAttribute(r,P),b.copy(T);const A=a[P];_.copy(A),_.sub(T.multiplyScalar(T.dot(A))).normalize(),M.crossVectors(b,A);const D=M.dot(l[P])<0?-1:1;o.setXYZW(P,_.x,_.y,_.z,D)}for(let P=0,A=v.length;P<A;++P){const S=v[P],D=S.start,B=S.count;for(let L=D,V=D+B;L<V;L+=3)E(e.getX(L+0)),E(e.getX(L+1)),E(e.getX(L+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Ht(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let p=0,f=i.count;p<f;p++)i.setXYZ(p,0,0,0);const r=new O,s=new O,o=new O,a=new O,l=new O,c=new O,u=new O,h=new O;if(e)for(let p=0,f=e.count;p<f;p+=3){const g=e.getX(p+0),y=e.getX(p+1),m=e.getX(p+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,y),o.fromBufferAttribute(t,m),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,m),a.add(u),l.add(u),c.add(u),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let p=0,f=t.count;p<f;p+=3)r.fromBufferAttribute(t,p+0),s.fromBufferAttribute(t,p+1),o.fromBufferAttribute(t,p+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),i.setXYZ(p+0,u.x,u.y,u.z),i.setXYZ(p+1,u.x,u.y,u.z),i.setXYZ(p+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)It.fromBufferAttribute(e,t),It.normalize(),e.setXYZ(t,It.x,It.y,It.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,h=a.normalized,p=new c.constructor(l.length*u);let f=0,g=0;for(let y=0,m=l.length;y<m;y++){a.isInterleavedBufferAttribute?f=l[y]*a.data.stride+a.offset:f=l[y]*u;for(let d=0;d<u;d++)p[g++]=c[f++]}return new Ht(p,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new ii,i=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,i);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,h=c.length;u<h;u++){const p=c[u],f=e(p,i);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,p=c.length;h<p;h++){const f=c[h];u.push(f.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],h=s[c];for(let p=0,f=h.length;p<f;p++)u.push(h[p].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const h=o[c];this.addGroup(h.start,h.count,h.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Pm=new Qe,wr=new sh,Ka=new rh,Nm=new O,ls=new O,cs=new O,us=new O,Pu=new O,Za=new O,Ja=new we,Qa=new we,el=new we,Lm=new O,Im=new O,Dm=new O,tl=new O,nl=new O;class At extends Ot{constructor(e=new ii,t=new Pc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){Za.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],h=s[l];u!==0&&(Pu.fromBufferAttribute(h,e),o?Za.addScaledVector(Pu,u):Za.addScaledVector(Pu.sub(t),u))}t.add(Za)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ka.copy(i.boundingSphere),Ka.applyMatrix4(s),wr.copy(e.ray).recast(e.near),!(Ka.containsPoint(wr.origin)===!1&&(wr.intersectSphere(Ka,Nm)===null||wr.origin.distanceToSquared(Nm)>(e.far-e.near)**2))&&(Pm.copy(s).invert(),wr.copy(e.ray).applyMatrix4(Pm),!(i.boundingBox!==null&&wr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,wr)))}_computeIntersections(e,t,i){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,p=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,y=p.length;g<y;g++){const m=p[g],d=o[m.materialIndex],v=Math.max(m.start,f.start),_=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let M=v,T=_;M<T;M+=3){const b=a.getX(M),E=a.getX(M+1),P=a.getX(M+2);r=il(this,d,e,i,c,u,h,b,E,P),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),y=Math.min(a.count,f.start+f.count);for(let m=g,d=y;m<d;m+=3){const v=a.getX(m),_=a.getX(m+1),M=a.getX(m+2);r=il(this,o,e,i,c,u,h,v,_,M),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,y=p.length;g<y;g++){const m=p[g],d=o[m.materialIndex],v=Math.max(m.start,f.start),_=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let M=v,T=_;M<T;M+=3){const b=M,E=M+1,P=M+2;r=il(this,d,e,i,c,u,h,b,E,P),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),y=Math.min(l.count,f.start+f.count);for(let m=g,d=y;m<d;m+=3){const v=m,_=m+1,M=m+2;r=il(this,o,e,i,c,u,h,v,_,M),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function XE(n,e,t,i,r,s,o,a){let l;if(e.side===hn?l=i.intersectTriangle(o,s,r,!0,a):l=i.intersectTriangle(r,s,o,e.side===hr,a),l===null)return null;nl.copy(a),nl.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(nl);return c<t.near||c>t.far?null:{distance:c,point:nl.clone(),object:n}}function il(n,e,t,i,r,s,o,a,l,c){n.getVertexPosition(a,ls),n.getVertexPosition(l,cs),n.getVertexPosition(c,us);const u=XE(n,e,t,i,ls,cs,us,tl);if(u){r&&(Ja.fromBufferAttribute(r,a),Qa.fromBufferAttribute(r,l),el.fromBufferAttribute(r,c),u.uv=li.getInterpolation(tl,ls,cs,us,Ja,Qa,el,new we)),s&&(Ja.fromBufferAttribute(s,a),Qa.fromBufferAttribute(s,l),el.fromBufferAttribute(s,c),u.uv1=li.getInterpolation(tl,ls,cs,us,Ja,Qa,el,new we)),o&&(Lm.fromBufferAttribute(o,a),Im.fromBufferAttribute(o,l),Dm.fromBufferAttribute(o,c),u.normal=li.getInterpolation(tl,ls,cs,us,Lm,Im,Dm,new O),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const h={a,b:l,c,normal:new O,materialIndex:0};li.getNormal(ls,cs,us,h.normal),u.face=h}return u}class Yr extends ii{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],h=[];let p=0,f=0;g("z","y","x",-1,-1,i,t,e,o,s,0),g("z","y","x",1,-1,i,t,-e,o,s,1),g("x","z","y",1,1,e,i,t,r,o,2),g("x","z","y",1,-1,e,i,-t,r,o,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new kt(c,3)),this.setAttribute("normal",new kt(u,3)),this.setAttribute("uv",new kt(h,2));function g(y,m,d,v,_,M,T,b,E,P,A){const S=M/E,D=T/P,B=M/2,L=T/2,V=b/2,j=E+1,Q=P+1;let $=0,F=0;const H=new O;for(let W=0;W<Q;W++){const z=W*D-L;for(let re=0;re<j;re++){const K=re*S-B;H[y]=K*v,H[m]=z*_,H[d]=V,c.push(H.x,H.y,H.z),H[y]=0,H[m]=0,H[d]=b>0?1:-1,u.push(H.x,H.y,H.z),h.push(re/E),h.push(1-W/P),$+=1}}for(let W=0;W<P;W++)for(let z=0;z<E;z++){const re=p+z+j*W,K=p+z+j*(W+1),k=p+(z+1)+j*(W+1),I=p+(z+1)+j*W;l.push(re,K,I),l.push(K,k,I),F+=6}a.addGroup(f,F,A),f+=F,p+=$}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Yr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Qs(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function nn(n){const e={};for(let t=0;t<n.length;t++){const i=Qs(n[t]);for(const r in i)e[r]=i[r]}return e}function $E(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function U_(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:st.workingColorSpace}const pa={clone:Qs,merge:nn};var YE=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,qE=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Vt extends Ma{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=YE,this.fragmentShader=qE,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Qs(e.uniforms),this.uniformsGroups=$E(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class F_ extends Ot{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Qe,this.projectionMatrix=new Qe,this.projectionMatrixInverse=new Qe,this.coordinateSystem=Ai}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Gi=new O,Um=new we,Fm=new we;class xn extends F_{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ha*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Wo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ha*2*Math.atan(Math.tan(Wo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Gi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Gi.x,Gi.y).multiplyScalar(-e/Gi.z),Gi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Gi.x,Gi.y).multiplyScalar(-e/Gi.z)}getViewSize(e,t){return this.getViewBounds(e,Um,Fm),t.subVectors(Fm,Um)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Wo*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,t-=o.offsetY*i/c,r*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ds=-90,fs=1;class KE extends Ot{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new xn(ds,fs,e,t);r.layers=this.layers,this.add(r);const s=new xn(ds,fs,e,t);s.layers=this.layers,this.add(s);const o=new xn(ds,fs,e,t);o.layers=this.layers,this.add(o);const a=new xn(ds,fs,e,t);a.layers=this.layers,this.add(a);const l=new xn(ds,fs,e,t);l.layers=this.layers,this.add(l);const c=new xn(ds,fs,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===Ai)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===sc)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,h=e.getRenderTarget(),p=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,o),e.setRenderTarget(i,2,r),e.render(t,a),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=y,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(h,p,f),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class O_ extends Qt{constructor(e,t,i,r,s,o,a,l,c,u){e=e!==void 0?e:[],t=t!==void 0?t:qs,super(e,t,i,r,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ZE extends ti{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new O_(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Fn}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Yr(5,5,5),s=new Vt({name:"CubemapFromEquirect",uniforms:Qs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:hn,blending:Ci});s.uniforms.tEquirect.value=t;const o=new At(r,s),a=t.minFilter;return t.minFilter===Qi&&(t.minFilter=Fn),new KE(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}}const Nu=new O,JE=new O,QE=new Be;class $i{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Nu.subVectors(i,t).cross(JE.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Nu),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||QE.getNormalMatrix(e),r=this.coplanarPoint(Nu).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Tr=new rh,rl=new O;class ah{constructor(e=new $i,t=new $i,i=new $i,r=new $i,s=new $i,o=new $i){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Ai){const i=this.planes,r=e.elements,s=r[0],o=r[1],a=r[2],l=r[3],c=r[4],u=r[5],h=r[6],p=r[7],f=r[8],g=r[9],y=r[10],m=r[11],d=r[12],v=r[13],_=r[14],M=r[15];if(i[0].setComponents(l-s,p-c,m-f,M-d).normalize(),i[1].setComponents(l+s,p+c,m+f,M+d).normalize(),i[2].setComponents(l+o,p+u,m+g,M+v).normalize(),i[3].setComponents(l-o,p-u,m-g,M-v).normalize(),i[4].setComponents(l-a,p-h,m-y,M-_).normalize(),t===Ai)i[5].setComponents(l+a,p+h,m+y,M+_).normalize();else if(t===sc)i[5].setComponents(a,h,y,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Tr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Tr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Tr)}intersectsSprite(e){return Tr.center.set(0,0,0),Tr.radius=.7071067811865476,Tr.applyMatrix4(e.matrixWorld),this.intersectsSphere(Tr)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(rl.x=r.normal.x>0?e.max.x:e.min.x,rl.y=r.normal.y>0?e.max.y:e.min.y,rl.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(rl)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function k_(){let n=null,e=!1,t=null,i=null;function r(s,o){t(s,o),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function ew(n){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,h=c.byteLength,p=n.createBuffer();n.bindBuffer(l,p),n.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:p,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:h}}function i(a,l,c){const u=l.array,h=l._updateRange,p=l.updateRanges;if(n.bindBuffer(c,a),h.count===-1&&p.length===0&&n.bufferSubData(c,0,u),p.length!==0){for(let f=0,g=p.length;f<g;f++){const y=p[f];n.bufferSubData(c,y.start*u.BYTES_PER_ELEMENT,u,y.start,y.count)}l.clearUpdateRanges()}h.count!==-1&&(n.bufferSubData(c,h.offset*u.BYTES_PER_ELEMENT,u,h.offset,h.count),h.count=-1),l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(n.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}class mr extends ii{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(i),l=Math.floor(r),c=a+1,u=l+1,h=e/a,p=t/l,f=[],g=[],y=[],m=[];for(let d=0;d<u;d++){const v=d*p-o;for(let _=0;_<c;_++){const M=_*h-s;g.push(M,-v,0),y.push(0,0,1),m.push(_/a),m.push(1-d/l)}}for(let d=0;d<l;d++)for(let v=0;v<a;v++){const _=v+c*d,M=v+c*(d+1),T=v+1+c*(d+1),b=v+1+c*d;f.push(_,M,b),f.push(M,T,b)}this.setIndex(f),this.setAttribute("position",new kt(g,3)),this.setAttribute("normal",new kt(y,3)),this.setAttribute("uv",new kt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new mr(e.width,e.height,e.widthSegments,e.heightSegments)}}var tw=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,nw=`#ifdef USE_ALPHAHASH
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
#endif`,iw=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,rw=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,sw=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ow=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aw=`#ifdef USE_AOMAP
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
#endif`,lw=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,cw=`#ifdef USE_BATCHING
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
#endif`,uw=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,dw=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,fw=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,hw=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,pw=`#ifdef USE_IRIDESCENCE
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
#endif`,mw=`#ifdef USE_BUMPMAP
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
#endif`,gw=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,vw=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,_w=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,xw=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,yw=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Mw=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Sw=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Ew=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,ww=`#define PI 3.141592653589793
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
} // validated`,Tw=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Aw=`vec3 transformedNormal = objectNormal;
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
#endif`,bw=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Cw=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Rw=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Pw=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Nw="gl_FragColor = linearToOutputTexel( gl_FragColor );",Lw=`
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
}`,Iw=`#ifdef USE_ENVMAP
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
#endif`,Dw=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Uw=`#ifdef USE_ENVMAP
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
#endif`,Fw=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ow=`#ifdef USE_ENVMAP
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
#endif`,kw=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,zw=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Bw=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Hw=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Vw=`#ifdef USE_GRADIENTMAP
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
}`,jw=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Gw=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ww=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Xw=`uniform bool receiveShadow;
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
#endif`,$w=`#ifdef USE_ENVMAP
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
#endif`,Yw=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,qw=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Kw=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Zw=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Jw=`PhysicalMaterial material;
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
#endif`,Qw=`struct PhysicalMaterial {
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
}`,eT=`
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
#endif`,tT=`#if defined( RE_IndirectDiffuse )
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
#endif`,nT=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,iT=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,rT=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sT=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,oT=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,aT=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,lT=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,cT=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,uT=`#if defined( USE_POINTS_UV )
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
#endif`,dT=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,fT=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,hT=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[MORPHTARGETS_COUNT];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,pT=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,mT=`#ifdef USE_MORPHNORMALS
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
#endif`,gT=`#ifdef USE_MORPHTARGETS
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
#endif`,vT=`#ifdef USE_MORPHTARGETS
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
#endif`,_T=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,xT=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,yT=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,MT=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ST=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ET=`#ifdef USE_NORMALMAP
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
#endif`,wT=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,TT=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,AT=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,bT=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,CT=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,RT=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,PT=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,NT=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,LT=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,IT=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,DT=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,UT=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,FT=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,OT=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,kT=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,zT=`float getShadowMask() {
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
}`,BT=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,HT=`#ifdef USE_SKINNING
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
#endif`,VT=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,jT=`#ifdef USE_SKINNING
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
#endif`,GT=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,WT=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,XT=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,$T=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,YT=`#ifdef USE_TRANSMISSION
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
#endif`,qT=`#ifdef USE_TRANSMISSION
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
#endif`,KT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ZT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,JT=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,QT=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const e1=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,t1=`uniform sampler2D t2D;
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
}`,n1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,i1=`#ifdef ENVMAP_TYPE_CUBE
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
}`,r1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,s1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,o1=`#include <common>
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
}`,a1=`#if DEPTH_PACKING == 3200
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
}`,l1=`#define DISTANCE
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
}`,c1=`#define DISTANCE
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
}`,u1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,d1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,f1=`uniform float scale;
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
}`,h1=`uniform vec3 diffuse;
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
}`,p1=`#include <common>
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
}`,m1=`uniform vec3 diffuse;
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
}`,g1=`#define LAMBERT
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
}`,v1=`#define LAMBERT
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
}`,_1=`#define MATCAP
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
}`,x1=`#define MATCAP
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
}`,y1=`#define NORMAL
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
}`,M1=`#define NORMAL
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
}`,S1=`#define PHONG
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
}`,E1=`#define PHONG
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
}`,w1=`#define STANDARD
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
}`,T1=`#define STANDARD
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
}`,A1=`#define TOON
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
}`,b1=`#define TOON
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
}`,C1=`uniform float size;
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
}`,R1=`uniform vec3 diffuse;
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
}`,P1=`#include <common>
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
}`,N1=`uniform vec3 color;
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
}`,L1=`uniform float rotation;
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
}`,I1=`uniform vec3 diffuse;
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
}`,Ge={alphahash_fragment:tw,alphahash_pars_fragment:nw,alphamap_fragment:iw,alphamap_pars_fragment:rw,alphatest_fragment:sw,alphatest_pars_fragment:ow,aomap_fragment:aw,aomap_pars_fragment:lw,batching_pars_vertex:cw,batching_vertex:uw,begin_vertex:dw,beginnormal_vertex:fw,bsdfs:hw,iridescence_fragment:pw,bumpmap_pars_fragment:mw,clipping_planes_fragment:gw,clipping_planes_pars_fragment:vw,clipping_planes_pars_vertex:_w,clipping_planes_vertex:xw,color_fragment:yw,color_pars_fragment:Mw,color_pars_vertex:Sw,color_vertex:Ew,common:ww,cube_uv_reflection_fragment:Tw,defaultnormal_vertex:Aw,displacementmap_pars_vertex:bw,displacementmap_vertex:Cw,emissivemap_fragment:Rw,emissivemap_pars_fragment:Pw,colorspace_fragment:Nw,colorspace_pars_fragment:Lw,envmap_fragment:Iw,envmap_common_pars_fragment:Dw,envmap_pars_fragment:Uw,envmap_pars_vertex:Fw,envmap_physical_pars_fragment:$w,envmap_vertex:Ow,fog_vertex:kw,fog_pars_vertex:zw,fog_fragment:Bw,fog_pars_fragment:Hw,gradientmap_pars_fragment:Vw,lightmap_pars_fragment:jw,lights_lambert_fragment:Gw,lights_lambert_pars_fragment:Ww,lights_pars_begin:Xw,lights_toon_fragment:Yw,lights_toon_pars_fragment:qw,lights_phong_fragment:Kw,lights_phong_pars_fragment:Zw,lights_physical_fragment:Jw,lights_physical_pars_fragment:Qw,lights_fragment_begin:eT,lights_fragment_maps:tT,lights_fragment_end:nT,logdepthbuf_fragment:iT,logdepthbuf_pars_fragment:rT,logdepthbuf_pars_vertex:sT,logdepthbuf_vertex:oT,map_fragment:aT,map_pars_fragment:lT,map_particle_fragment:cT,map_particle_pars_fragment:uT,metalnessmap_fragment:dT,metalnessmap_pars_fragment:fT,morphinstance_vertex:hT,morphcolor_vertex:pT,morphnormal_vertex:mT,morphtarget_pars_vertex:gT,morphtarget_vertex:vT,normal_fragment_begin:_T,normal_fragment_maps:xT,normal_pars_fragment:yT,normal_pars_vertex:MT,normal_vertex:ST,normalmap_pars_fragment:ET,clearcoat_normal_fragment_begin:wT,clearcoat_normal_fragment_maps:TT,clearcoat_pars_fragment:AT,iridescence_pars_fragment:bT,opaque_fragment:CT,packing:RT,premultiplied_alpha_fragment:PT,project_vertex:NT,dithering_fragment:LT,dithering_pars_fragment:IT,roughnessmap_fragment:DT,roughnessmap_pars_fragment:UT,shadowmap_pars_fragment:FT,shadowmap_pars_vertex:OT,shadowmap_vertex:kT,shadowmask_pars_fragment:zT,skinbase_vertex:BT,skinning_pars_vertex:HT,skinning_vertex:VT,skinnormal_vertex:jT,specularmap_fragment:GT,specularmap_pars_fragment:WT,tonemapping_fragment:XT,tonemapping_pars_fragment:$T,transmission_fragment:YT,transmission_pars_fragment:qT,uv_pars_fragment:KT,uv_pars_vertex:ZT,uv_vertex:JT,worldpos_vertex:QT,background_vert:e1,background_frag:t1,backgroundCube_vert:n1,backgroundCube_frag:i1,cube_vert:r1,cube_frag:s1,depth_vert:o1,depth_frag:a1,distanceRGBA_vert:l1,distanceRGBA_frag:c1,equirect_vert:u1,equirect_frag:d1,linedashed_vert:f1,linedashed_frag:h1,meshbasic_vert:p1,meshbasic_frag:m1,meshlambert_vert:g1,meshlambert_frag:v1,meshmatcap_vert:_1,meshmatcap_frag:x1,meshnormal_vert:y1,meshnormal_frag:M1,meshphong_vert:S1,meshphong_frag:E1,meshphysical_vert:w1,meshphysical_frag:T1,meshtoon_vert:A1,meshtoon_frag:b1,points_vert:C1,points_frag:R1,shadow_vert:P1,shadow_frag:N1,sprite_vert:L1,sprite_frag:I1},me={common:{diffuse:{value:new He(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new He(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new He(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new He(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},oi={basic:{uniforms:nn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.fog]),vertexShader:Ge.meshbasic_vert,fragmentShader:Ge.meshbasic_frag},lambert:{uniforms:nn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new He(0)}}]),vertexShader:Ge.meshlambert_vert,fragmentShader:Ge.meshlambert_frag},phong:{uniforms:nn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new He(0)},specular:{value:new He(1118481)},shininess:{value:30}}]),vertexShader:Ge.meshphong_vert,fragmentShader:Ge.meshphong_frag},standard:{uniforms:nn([me.common,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.roughnessmap,me.metalnessmap,me.fog,me.lights,{emissive:{value:new He(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag},toon:{uniforms:nn([me.common,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.gradientmap,me.fog,me.lights,{emissive:{value:new He(0)}}]),vertexShader:Ge.meshtoon_vert,fragmentShader:Ge.meshtoon_frag},matcap:{uniforms:nn([me.common,me.bumpmap,me.normalmap,me.displacementmap,me.fog,{matcap:{value:null}}]),vertexShader:Ge.meshmatcap_vert,fragmentShader:Ge.meshmatcap_frag},points:{uniforms:nn([me.points,me.fog]),vertexShader:Ge.points_vert,fragmentShader:Ge.points_frag},dashed:{uniforms:nn([me.common,me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ge.linedashed_vert,fragmentShader:Ge.linedashed_frag},depth:{uniforms:nn([me.common,me.displacementmap]),vertexShader:Ge.depth_vert,fragmentShader:Ge.depth_frag},normal:{uniforms:nn([me.common,me.bumpmap,me.normalmap,me.displacementmap,{opacity:{value:1}}]),vertexShader:Ge.meshnormal_vert,fragmentShader:Ge.meshnormal_frag},sprite:{uniforms:nn([me.sprite,me.fog]),vertexShader:Ge.sprite_vert,fragmentShader:Ge.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ge.background_vert,fragmentShader:Ge.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:Ge.backgroundCube_vert,fragmentShader:Ge.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ge.cube_vert,fragmentShader:Ge.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ge.equirect_vert,fragmentShader:Ge.equirect_frag},distanceRGBA:{uniforms:nn([me.common,me.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ge.distanceRGBA_vert,fragmentShader:Ge.distanceRGBA_frag},shadow:{uniforms:nn([me.lights,me.fog,{color:{value:new He(0)},opacity:{value:1}}]),vertexShader:Ge.shadow_vert,fragmentShader:Ge.shadow_frag}};oi.physical={uniforms:nn([oi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new He(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new He(0)},specularColor:{value:new He(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag};const sl={r:0,b:0,g:0},Ar=new di,D1=new Qe;function U1(n,e,t,i,r,s,o){const a=new He(0);let l=s===!0?0:1,c,u,h=null,p=0,f=null;function g(v){let _=v.isScene===!0?v.background:null;return _&&_.isTexture&&(_=(v.backgroundBlurriness>0?t:e).get(_)),_}function y(v){let _=!1;const M=g(v);M===null?d(a,l):M&&M.isColor&&(d(M,1),_=!0);const T=n.xr.getEnvironmentBlendMode();T==="additive"?i.buffers.color.setClear(0,0,0,1,o):T==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||_)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil)}function m(v,_){const M=g(_);M&&(M.isCubeTexture||M.mapping===Cc)?(u===void 0&&(u=new At(new Yr(1,1,1),new Vt({name:"BackgroundCubeMaterial",uniforms:Qs(oi.backgroundCube.uniforms),vertexShader:oi.backgroundCube.vertexShader,fragmentShader:oi.backgroundCube.fragmentShader,side:hn,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(T,b,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Ar.copy(_.backgroundRotation),Ar.x*=-1,Ar.y*=-1,Ar.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Ar.y*=-1,Ar.z*=-1),u.material.uniforms.envMap.value=M,u.material.uniforms.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(D1.makeRotationFromEuler(Ar)),u.material.toneMapped=st.getTransfer(M.colorSpace)!==lt,(h!==M||p!==M.version||f!==n.toneMapping)&&(u.material.needsUpdate=!0,h=M,p=M.version,f=n.toneMapping),u.layers.enableAll(),v.unshift(u,u.geometry,u.material,0,0,null)):M&&M.isTexture&&(c===void 0&&(c=new At(new mr(2,2),new Vt({name:"BackgroundMaterial",uniforms:Qs(oi.background.uniforms),vertexShader:oi.background.vertexShader,fragmentShader:oi.background.fragmentShader,side:hr,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=M,c.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,c.material.toneMapped=st.getTransfer(M.colorSpace)!==lt,M.matrixAutoUpdate===!0&&M.updateMatrix(),c.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||p!==M.version||f!==n.toneMapping)&&(c.material.needsUpdate=!0,h=M,p=M.version,f=n.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null))}function d(v,_){v.getRGB(sl,U_(n)),i.buffers.color.setClear(sl.r,sl.g,sl.b,_,o)}return{getClearColor:function(){return a},setClearColor:function(v,_=1){a.set(v),l=_,d(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(v){l=v,d(a,l)},render:y,addToRenderList:m}}function F1(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=p(null);let s=r,o=!1;function a(S,D,B,L,V){let j=!1;const Q=h(L,B,D);s!==Q&&(s=Q,c(s.object)),j=f(S,L,B,V),j&&g(S,L,B,V),V!==null&&e.update(V,n.ELEMENT_ARRAY_BUFFER),(j||o)&&(o=!1,M(S,D,B,L),V!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(V).buffer))}function l(){return n.createVertexArray()}function c(S){return n.bindVertexArray(S)}function u(S){return n.deleteVertexArray(S)}function h(S,D,B){const L=B.wireframe===!0;let V=i[S.id];V===void 0&&(V={},i[S.id]=V);let j=V[D.id];j===void 0&&(j={},V[D.id]=j);let Q=j[L];return Q===void 0&&(Q=p(l()),j[L]=Q),Q}function p(S){const D=[],B=[],L=[];for(let V=0;V<t;V++)D[V]=0,B[V]=0,L[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:B,attributeDivisors:L,object:S,attributes:{},index:null}}function f(S,D,B,L){const V=s.attributes,j=D.attributes;let Q=0;const $=B.getAttributes();for(const F in $)if($[F].location>=0){const W=V[F];let z=j[F];if(z===void 0&&(F==="instanceMatrix"&&S.instanceMatrix&&(z=S.instanceMatrix),F==="instanceColor"&&S.instanceColor&&(z=S.instanceColor)),W===void 0||W.attribute!==z||z&&W.data!==z.data)return!0;Q++}return s.attributesNum!==Q||s.index!==L}function g(S,D,B,L){const V={},j=D.attributes;let Q=0;const $=B.getAttributes();for(const F in $)if($[F].location>=0){let W=j[F];W===void 0&&(F==="instanceMatrix"&&S.instanceMatrix&&(W=S.instanceMatrix),F==="instanceColor"&&S.instanceColor&&(W=S.instanceColor));const z={};z.attribute=W,W&&W.data&&(z.data=W.data),V[F]=z,Q++}s.attributes=V,s.attributesNum=Q,s.index=L}function y(){const S=s.newAttributes;for(let D=0,B=S.length;D<B;D++)S[D]=0}function m(S){d(S,0)}function d(S,D){const B=s.newAttributes,L=s.enabledAttributes,V=s.attributeDivisors;B[S]=1,L[S]===0&&(n.enableVertexAttribArray(S),L[S]=1),V[S]!==D&&(n.vertexAttribDivisor(S,D),V[S]=D)}function v(){const S=s.newAttributes,D=s.enabledAttributes;for(let B=0,L=D.length;B<L;B++)D[B]!==S[B]&&(n.disableVertexAttribArray(B),D[B]=0)}function _(S,D,B,L,V,j,Q){Q===!0?n.vertexAttribIPointer(S,D,B,V,j):n.vertexAttribPointer(S,D,B,L,V,j)}function M(S,D,B,L){y();const V=L.attributes,j=B.getAttributes(),Q=D.defaultAttributeValues;for(const $ in j){const F=j[$];if(F.location>=0){let H=V[$];if(H===void 0&&($==="instanceMatrix"&&S.instanceMatrix&&(H=S.instanceMatrix),$==="instanceColor"&&S.instanceColor&&(H=S.instanceColor)),H!==void 0){const W=H.normalized,z=H.itemSize,re=e.get(H);if(re===void 0)continue;const K=re.buffer,k=re.type,I=re.bytesPerElement,ne=k===n.INT||k===n.UNSIGNED_INT||H.gpuType===S_;if(H.isInterleavedBufferAttribute){const ee=H.data,pe=ee.stride,Ee=H.offset;if(ee.isInstancedInterleavedBuffer){for(let U=0;U<F.locationSize;U++)d(F.location+U,ee.meshPerAttribute);S.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let U=0;U<F.locationSize;U++)m(F.location+U);n.bindBuffer(n.ARRAY_BUFFER,K);for(let U=0;U<F.locationSize;U++)_(F.location+U,z/F.locationSize,k,W,pe*I,(Ee+z/F.locationSize*U)*I,ne)}else{if(H.isInstancedBufferAttribute){for(let ee=0;ee<F.locationSize;ee++)d(F.location+ee,H.meshPerAttribute);S.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=H.meshPerAttribute*H.count)}else for(let ee=0;ee<F.locationSize;ee++)m(F.location+ee);n.bindBuffer(n.ARRAY_BUFFER,K);for(let ee=0;ee<F.locationSize;ee++)_(F.location+ee,z/F.locationSize,k,W,z*I,z/F.locationSize*ee*I,ne)}}else if(Q!==void 0){const W=Q[$];if(W!==void 0)switch(W.length){case 2:n.vertexAttrib2fv(F.location,W);break;case 3:n.vertexAttrib3fv(F.location,W);break;case 4:n.vertexAttrib4fv(F.location,W);break;default:n.vertexAttrib1fv(F.location,W)}}}}v()}function T(){P();for(const S in i){const D=i[S];for(const B in D){const L=D[B];for(const V in L)u(L[V].object),delete L[V];delete D[B]}delete i[S]}}function b(S){if(i[S.id]===void 0)return;const D=i[S.id];for(const B in D){const L=D[B];for(const V in L)u(L[V].object),delete L[V];delete D[B]}delete i[S.id]}function E(S){for(const D in i){const B=i[D];if(B[S.id]===void 0)continue;const L=B[S.id];for(const V in L)u(L[V].object),delete L[V];delete B[S.id]}}function P(){A(),o=!0,s!==r&&(s=r,c(s.object))}function A(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:P,resetDefaultState:A,dispose:T,releaseStatesOfGeometry:b,releaseStatesOfProgram:E,initAttributes:y,enableAttribute:m,disableUnusedAttributes:v}}function O1(n,e,t){let i;function r(c){i=c}function s(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function o(c,u,h){h!==0&&(n.drawArraysInstanced(i,c,u,h),t.update(u,i,h))}function a(c,u,h){if(h===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<h;f++)this.render(c[f],u[f]);else{p.multiDrawArraysWEBGL(i,c,0,u,0,h);let f=0;for(let g=0;g<h;g++)f+=u[g];t.update(f,i,1)}}function l(c,u,h,p){if(h===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)o(c[g],u[g],p[g]);else{f.multiDrawArraysInstancedWEBGL(i,c,0,u,0,p,0,h);let g=0;for(let y=0;y<h;y++)g+=u[y];for(let y=0;y<p.length;y++)t.update(g,i,p[y])}}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function k1(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const b=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(b.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(b){return!(b!==Jn&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(b){const E=b===ur&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(b!==pr&&i.convert(b)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&b!==er&&!E)}function l(b){if(b==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";b="mediump"}return b==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=t.logarithmicDepthBuffer===!0,p=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),f=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),y=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),d=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),v=n.getParameter(n.MAX_VARYING_VECTORS),_=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),M=f>0,T=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:h,maxTextures:p,maxVertexTextures:f,maxTextureSize:g,maxCubemapSize:y,maxAttributes:m,maxVertexUniforms:d,maxVaryings:v,maxFragmentUniforms:_,vertexTextures:M,maxSamples:T}}function z1(n){const e=this;let t=null,i=0,r=!1,s=!1;const o=new $i,a=new Be,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,p){const f=h.length!==0||p||i!==0||r;return r=p,i=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,p){t=u(h,p,0)},this.setState=function(h,p,f){const g=h.clippingPlanes,y=h.clipIntersection,m=h.clipShadows,d=n.get(h);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const v=s?0:i,_=v*4;let M=d.clippingState||null;l.value=M,M=u(g,p,_,f);for(let T=0;T!==_;++T)M[T]=t[T];d.clippingState=M,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(h,p,f,g){const y=h!==null?h.length:0;let m=null;if(y!==0){if(m=l.value,g!==!0||m===null){const d=f+y*4,v=p.matrixWorldInverse;a.getNormalMatrix(v),(m===null||m.length<d)&&(m=new Float32Array(d));for(let _=0,M=f;_!==y;++_,M+=4)o.copy(h[_]).applyMatrix4(v,a),o.normal.toArray(m,M),m[M+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,m}}function B1(n){let e=new WeakMap;function t(o,a){return a===Jd?o.mapping=qs:a===Qd&&(o.mapping=Ks),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===Jd||a===Qd)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new ZE(l.height);return c.fromEquirectangularTexture(n,o),e.set(o,c),o.addEventListener("dispose",r),t(c.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class lh extends F_{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const Ps=4,Om=[.125,.215,.35,.446,.526,.582],Ir=20,Lu=new lh,km=new He;let Iu=null,Du=0,Uu=0,Fu=!1;const Nr=(1+Math.sqrt(5))/2,hs=1/Nr,zm=[new O(-Nr,hs,0),new O(Nr,hs,0),new O(-hs,0,Nr),new O(hs,0,Nr),new O(0,Nr,-hs),new O(0,Nr,hs),new O(-1,1,-1),new O(1,1,-1),new O(-1,1,1),new O(1,1,1)];class Bm{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){Iu=this._renderer.getRenderTarget(),Du=this._renderer.getActiveCubeFace(),Uu=this._renderer.getActiveMipmapLevel(),Fu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=jm(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Vm(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Iu,Du,Uu),this._renderer.xr.enabled=Fu,e.scissorTest=!1,ol(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===qs||e.mapping===Ks?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Iu=this._renderer.getRenderTarget(),Du=this._renderer.getActiveCubeFace(),Uu=this._renderer.getActiveMipmapLevel(),Fu=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Fn,minFilter:Fn,generateMipmaps:!1,type:ur,format:Jn,colorSpace:yr,depthBuffer:!1},r=Hm(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Hm(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=H1(s)),this._blurMaterial=V1(s,e,t)}return r}_compileMaterial(e){const t=new At(this._lodPlanes[0],e);this._renderer.compile(t,Lu)}_sceneToCubeUV(e,t,i,r){const a=new xn(90,1,t,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,p=u.toneMapping;u.getClearColor(km),u.toneMapping=cr,u.autoClear=!1;const f=new Pc({name:"PMREM.Background",side:hn,depthWrite:!1,depthTest:!1}),g=new At(new Yr,f);let y=!1;const m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,y=!0):(f.color.copy(km),y=!0);for(let d=0;d<6;d++){const v=d%3;v===0?(a.up.set(0,l[d],0),a.lookAt(c[d],0,0)):v===1?(a.up.set(0,0,l[d]),a.lookAt(0,c[d],0)):(a.up.set(0,l[d],0),a.lookAt(0,0,c[d]));const _=this._cubeSize;ol(r,v*_,d>2?_:0,_,_),u.setRenderTarget(r),y&&u.render(g,a),u.render(e,a)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=p,u.autoClear=h,e.background=m}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===qs||e.mapping===Ks;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=jm()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Vm());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new At(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;ol(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,Lu)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const o=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),a=zm[(r-s-1)%zm.length];this._blur(e,s-1,s,o,a)}t.autoClear=i}_blur(e,t,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new At(this._lodPlanes[r],c),p=c.uniforms,f=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*Ir-1),y=s/g,m=isFinite(s)?1+Math.floor(u*y):Ir;m>Ir&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ir}`);const d=[];let v=0;for(let E=0;E<Ir;++E){const P=E/y,A=Math.exp(-P*P/2);d.push(A),E===0?v+=A:E<m&&(v+=2*A)}for(let E=0;E<d.length;E++)d[E]=d[E]/v;p.envMap.value=e.texture,p.samples.value=m,p.weights.value=d,p.latitudinal.value=o==="latitudinal",a&&(p.poleAxis.value=a);const{_lodMax:_}=this;p.dTheta.value=g,p.mipInt.value=_-i;const M=this._sizeLods[r],T=3*M*(r>_-Ps?r-_+Ps:0),b=4*(this._cubeSize-M);ol(t,T,b,3*M,2*M),l.setRenderTarget(t),l.render(h,Lu)}}function H1(n){const e=[],t=[],i=[];let r=n;const s=n-Ps+1+Om.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let l=1/a;o>n-Ps?l=Om[o-n+Ps-1]:o===0&&(l=0),i.push(l);const c=1/(a-2),u=-c,h=1+c,p=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,y=3,m=2,d=1,v=new Float32Array(y*g*f),_=new Float32Array(m*g*f),M=new Float32Array(d*g*f);for(let b=0;b<f;b++){const E=b%3*2/3-1,P=b>2?0:-1,A=[E,P,0,E+2/3,P,0,E+2/3,P+1,0,E,P,0,E+2/3,P+1,0,E,P+1,0];v.set(A,y*g*b),_.set(p,m*g*b);const S=[b,b,b,b,b,b];M.set(S,d*g*b)}const T=new ii;T.setAttribute("position",new Ht(v,y)),T.setAttribute("uv",new Ht(_,m)),T.setAttribute("faceIndex",new Ht(M,d)),e.push(T),r>Ps&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function Hm(n,e,t){const i=new ti(n,e,t);return i.texture.mapping=Cc,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function ol(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function V1(n,e,t){const i=new Float32Array(Ir),r=new O(0,1,0);return new Vt({name:"SphericalGaussianBlur",defines:{n:Ir,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:ch(),fragmentShader:`

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
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function Vm(){return new Vt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ch(),fragmentShader:`

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
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function jm(){return new Vt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ch(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function ch(){return`

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
	`}function j1(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===Jd||l===Qd,u=l===qs||l===Ks;if(c||u){let h=e.get(a);const p=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==p)return t===null&&(t=new Bm(n)),h=c?t.fromEquirectangular(a,h):t.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),h.texture;if(h!==void 0)return h.texture;{const f=a.image;return c&&f&&f.height>0||u&&f&&r(f)?(t===null&&(t=new Bm(n)),h=c?t.fromEquirectangular(a):t.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function r(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function G1(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function W1(n,e,t,i){const r={},s=new WeakMap;function o(h){const p=h.target;p.index!==null&&e.remove(p.index);for(const g in p.attributes)e.remove(p.attributes[g]);for(const g in p.morphAttributes){const y=p.morphAttributes[g];for(let m=0,d=y.length;m<d;m++)e.remove(y[m])}p.removeEventListener("dispose",o),delete r[p.id];const f=s.get(p);f&&(e.remove(f),s.delete(p)),i.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function a(h,p){return r[p.id]===!0||(p.addEventListener("dispose",o),r[p.id]=!0,t.memory.geometries++),p}function l(h){const p=h.attributes;for(const g in p)e.update(p[g],n.ARRAY_BUFFER);const f=h.morphAttributes;for(const g in f){const y=f[g];for(let m=0,d=y.length;m<d;m++)e.update(y[m],n.ARRAY_BUFFER)}}function c(h){const p=[],f=h.index,g=h.attributes.position;let y=0;if(f!==null){const v=f.array;y=f.version;for(let _=0,M=v.length;_<M;_+=3){const T=v[_+0],b=v[_+1],E=v[_+2];p.push(T,b,b,E,E,T)}}else if(g!==void 0){const v=g.array;y=g.version;for(let _=0,M=v.length/3-1;_<M;_+=3){const T=_+0,b=_+1,E=_+2;p.push(T,b,b,E,E,T)}}else return;const m=new(P_(p)?D_:I_)(p,1);m.version=y;const d=s.get(h);d&&e.remove(d),s.set(h,m)}function u(h){const p=s.get(h);if(p){const f=h.index;f!==null&&p.version<f.version&&c(h)}else c(h);return s.get(h)}return{get:a,update:l,getWireframeAttribute:u}}function X1(n,e,t){let i;function r(p){i=p}let s,o;function a(p){s=p.type,o=p.bytesPerElement}function l(p,f){n.drawElements(i,f,s,p*o),t.update(f,i,1)}function c(p,f,g){g!==0&&(n.drawElementsInstanced(i,f,s,p*o,g),t.update(f,i,g))}function u(p,f,g){if(g===0)return;const y=e.get("WEBGL_multi_draw");if(y===null)for(let m=0;m<g;m++)this.render(p[m]/o,f[m]);else{y.multiDrawElementsWEBGL(i,f,0,s,p,0,g);let m=0;for(let d=0;d<g;d++)m+=f[d];t.update(m,i,1)}}function h(p,f,g,y){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let d=0;d<p.length;d++)c(p[d]/o,f[d],y[d]);else{m.multiDrawElementsInstancedWEBGL(i,f,0,s,p,0,y,0,g);let d=0;for(let v=0;v<g;v++)d+=f[v];for(let v=0;v<y.length;v++)t.update(d,i,y[v])}}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function $1(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Y1(n,e,t){const i=new WeakMap,r=new Ut;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0;let p=i.get(a);if(p===void 0||p.count!==h){let S=function(){P.dispose(),i.delete(a),a.removeEventListener("dispose",S)};var f=S;p!==void 0&&p.texture.dispose();const g=a.morphAttributes.position!==void 0,y=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,d=a.morphAttributes.position||[],v=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let M=0;g===!0&&(M=1),y===!0&&(M=2),m===!0&&(M=3);let T=a.attributes.position.count*M,b=1;T>e.maxTextureSize&&(b=Math.ceil(T/e.maxTextureSize),T=e.maxTextureSize);const E=new Float32Array(T*b*4*h),P=new N_(E,T,b,h);P.type=er,P.needsUpdate=!0;const A=M*4;for(let D=0;D<h;D++){const B=d[D],L=v[D],V=_[D],j=T*b*4*D;for(let Q=0;Q<B.count;Q++){const $=Q*A;g===!0&&(r.fromBufferAttribute(B,Q),E[j+$+0]=r.x,E[j+$+1]=r.y,E[j+$+2]=r.z,E[j+$+3]=0),y===!0&&(r.fromBufferAttribute(L,Q),E[j+$+4]=r.x,E[j+$+5]=r.y,E[j+$+6]=r.z,E[j+$+7]=0),m===!0&&(r.fromBufferAttribute(V,Q),E[j+$+8]=r.x,E[j+$+9]=r.y,E[j+$+10]=r.z,E[j+$+11]=V.itemSize===4?r.w:1)}}p={count:h,texture:P,size:new we(T,b)},i.set(a,p),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let g=0;for(let m=0;m<c.length;m++)g+=c[m];const y=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(n,"morphTargetBaseInfluence",y),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",p.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}return{update:s}}function q1(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,u=l.geometry,h=e.get(l,u);if(r.get(h)!==c&&(e.update(h),r.set(h,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const p=l.skeleton;r.get(p)!==c&&(p.update(),r.set(p,c))}return h}function o(){r=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}class z_ extends Qt{constructor(e,t,i,r,s,o,a,l,c,u){if(u=u!==void 0?u:zs,u!==zs&&u!==fa)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&u===zs&&(i=Zs),i===void 0&&u===fa&&(i=ya),super(null,r,s,o,a,l,u,i,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=a!==void 0?a:Sn,this.minFilter=l!==void 0?l:Sn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const B_=new Qt,H_=new z_(1,1);H_.compareFunction=R_;const V_=new N_,j_=new FE,G_=new O_,Gm=[],Wm=[],Xm=new Float32Array(16),$m=new Float32Array(9),Ym=new Float32Array(4);function oo(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=Gm[r];if(s===void 0&&(s=new Float32Array(r),Gm[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function Pt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Nt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Nc(n,e){let t=Wm[e];t===void 0&&(t=new Int32Array(e),Wm[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function K1(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Z1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2fv(this.addr,e),Nt(t,e)}}function J1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;n.uniform3fv(this.addr,e),Nt(t,e)}}function Q1(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4fv(this.addr,e),Nt(t,e)}}function eA(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Ym.set(i),n.uniformMatrix2fv(this.addr,!1,Ym),Nt(t,i)}}function tA(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;$m.set(i),n.uniformMatrix3fv(this.addr,!1,$m),Nt(t,i)}}function nA(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Pt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Nt(t,e)}else{if(Pt(t,i))return;Xm.set(i),n.uniformMatrix4fv(this.addr,!1,Xm),Nt(t,i)}}function iA(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function rA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2iv(this.addr,e),Nt(t,e)}}function sA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3iv(this.addr,e),Nt(t,e)}}function oA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4iv(this.addr,e),Nt(t,e)}}function aA(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function lA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;n.uniform2uiv(this.addr,e),Nt(t,e)}}function cA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;n.uniform3uiv(this.addr,e),Nt(t,e)}}function uA(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;n.uniform4uiv(this.addr,e),Nt(t,e)}}function dA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);const s=this.type===n.SAMPLER_2D_SHADOW?H_:B_;t.setTexture2D(e||s,r)}function fA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||j_,r)}function hA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||G_,r)}function pA(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||V_,r)}function mA(n){switch(n){case 5126:return K1;case 35664:return Z1;case 35665:return J1;case 35666:return Q1;case 35674:return eA;case 35675:return tA;case 35676:return nA;case 5124:case 35670:return iA;case 35667:case 35671:return rA;case 35668:case 35672:return sA;case 35669:case 35673:return oA;case 5125:return aA;case 36294:return lA;case 36295:return cA;case 36296:return uA;case 35678:case 36198:case 36298:case 36306:case 35682:return dA;case 35679:case 36299:case 36307:return fA;case 35680:case 36300:case 36308:case 36293:return hA;case 36289:case 36303:case 36311:case 36292:return pA}}function gA(n,e){n.uniform1fv(this.addr,e)}function vA(n,e){const t=oo(e,this.size,2);n.uniform2fv(this.addr,t)}function _A(n,e){const t=oo(e,this.size,3);n.uniform3fv(this.addr,t)}function xA(n,e){const t=oo(e,this.size,4);n.uniform4fv(this.addr,t)}function yA(n,e){const t=oo(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function MA(n,e){const t=oo(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function SA(n,e){const t=oo(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function EA(n,e){n.uniform1iv(this.addr,e)}function wA(n,e){n.uniform2iv(this.addr,e)}function TA(n,e){n.uniform3iv(this.addr,e)}function AA(n,e){n.uniform4iv(this.addr,e)}function bA(n,e){n.uniform1uiv(this.addr,e)}function CA(n,e){n.uniform2uiv(this.addr,e)}function RA(n,e){n.uniform3uiv(this.addr,e)}function PA(n,e){n.uniform4uiv(this.addr,e)}function NA(n,e,t){const i=this.cache,r=e.length,s=Nc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||B_,s[o])}function LA(n,e,t){const i=this.cache,r=e.length,s=Nc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||j_,s[o])}function IA(n,e,t){const i=this.cache,r=e.length,s=Nc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||G_,s[o])}function DA(n,e,t){const i=this.cache,r=e.length,s=Nc(t,r);Pt(i,s)||(n.uniform1iv(this.addr,s),Nt(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||V_,s[o])}function UA(n){switch(n){case 5126:return gA;case 35664:return vA;case 35665:return _A;case 35666:return xA;case 35674:return yA;case 35675:return MA;case 35676:return SA;case 5124:case 35670:return EA;case 35667:case 35671:return wA;case 35668:case 35672:return TA;case 35669:case 35673:return AA;case 5125:return bA;case 36294:return CA;case 36295:return RA;case 36296:return PA;case 35678:case 36198:case 36298:case 36306:case 35682:return NA;case 35679:case 36299:case 36307:return LA;case 35680:case 36300:case 36308:case 36293:return IA;case 36289:case 36303:case 36311:case 36292:return DA}}class FA{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=mA(t.type)}}class OA{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=UA(t.type)}}class kA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],i)}}}const Ou=/(\w+)(\])?(\[|\.)?/g;function qm(n,e){n.seq.push(e),n.map[e.id]=e}function zA(n,e,t){const i=n.name,r=i.length;for(Ou.lastIndex=0;;){const s=Ou.exec(i),o=Ou.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){qm(t,c===void 0?new FA(a,n,e):new OA(a,n,e));break}else{let h=t.map[a];h===void 0&&(h=new kA(a),qm(t,h)),t=h}}}class Al{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);zA(s,o,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&i.push(o)}return i}}function Km(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const BA=37297;let HA=0;function VA(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}function jA(n){const e=st.getPrimaries(st.workingColorSpace),t=st.getPrimaries(n);let i;switch(e===t?i="":e===rc&&t===ic?i="LinearDisplayP3ToLinearSRGB":e===ic&&t===rc&&(i="LinearSRGBToLinearDisplayP3"),n){case yr:case Rc:return[i,"LinearTransferOETF"];case _n:case th:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function Zm(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+VA(n.getShaderSource(e),o)}else return r}function GA(n,e){const t=jA(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function WA(n,e){let t;switch(e){case p_:t="Linear";break;case m_:t="Reinhard";break;case g_:t="OptimizedCineon";break;case eh:t="ACESFilmic";break;case v_:t="AgX";break;case __:t="Neutral";break;case GS:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function XA(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Io).join(`
`)}function $A(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function YA(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function Io(n){return n!==""}function Jm(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Qm(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const qA=/^[ \t]*#include +<([\w\d./]+)>/gm;function ef(n){return n.replace(qA,ZA)}const KA=new Map;function ZA(n,e){let t=Ge[e];if(t===void 0){const i=KA.get(e);if(i!==void 0)t=Ge[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return ef(t)}const JA=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function eg(n){return n.replace(JA,QA)}function QA(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function tg(n){let e=`precision ${n.precision} float;
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
#define LOW_PRECISION`),e}function eb(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===d_?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===f_?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===yi&&(e="SHADOWMAP_TYPE_VSM"),e}function tb(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case qs:case Ks:e="ENVMAP_TYPE_CUBE";break;case Cc:e="ENVMAP_TYPE_CUBE_UV";break}return e}function nb(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Ks:e="ENVMAP_MODE_REFRACTION";break}return e}function ib(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case h_:e="ENVMAP_BLENDING_MULTIPLY";break;case VS:e="ENVMAP_BLENDING_MIX";break;case jS:e="ENVMAP_BLENDING_ADD";break}return e}function rb(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function sb(n,e,t,i){const r=n.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=eb(t),c=tb(t),u=nb(t),h=ib(t),p=rb(t),f=XA(t),g=$A(s),y=r.createProgram();let m,d,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Io).join(`
`),m.length>0&&(m+=`
`),d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Io).join(`
`),d.length>0&&(d+=`
`)):(m=[tg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Io).join(`
`),d=[tg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==cr?"#define TONE_MAPPING":"",t.toneMapping!==cr?Ge.tonemapping_pars_fragment:"",t.toneMapping!==cr?WA("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ge.colorspace_pars_fragment,GA("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Io).join(`
`)),o=ef(o),o=Jm(o,t),o=Qm(o,t),a=ef(a),a=Jm(a,t),a=Qm(a,t),o=eg(o),a=eg(a),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,d=["#define varying in",t.glslVersion===gm?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===gm?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);const _=v+m+o,M=v+d+a,T=Km(r,r.VERTEX_SHADER,_),b=Km(r,r.FRAGMENT_SHADER,M);r.attachShader(y,T),r.attachShader(y,b),t.index0AttributeName!==void 0?r.bindAttribLocation(y,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(y,0,"position"),r.linkProgram(y);function E(D){if(n.debug.checkShaderErrors){const B=r.getProgramInfoLog(y).trim(),L=r.getShaderInfoLog(T).trim(),V=r.getShaderInfoLog(b).trim();let j=!0,Q=!0;if(r.getProgramParameter(y,r.LINK_STATUS)===!1)if(j=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,y,T,b);else{const $=Zm(r,T,"vertex"),F=Zm(r,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(y,r.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+B+`
`+$+`
`+F)}else B!==""?console.warn("THREE.WebGLProgram: Program Info Log:",B):(L===""||V==="")&&(Q=!1);Q&&(D.diagnostics={runnable:j,programLog:B,vertexShader:{log:L,prefix:m},fragmentShader:{log:V,prefix:d}})}r.deleteShader(T),r.deleteShader(b),P=new Al(r,y),A=YA(r,y)}let P;this.getUniforms=function(){return P===void 0&&E(this),P};let A;this.getAttributes=function(){return A===void 0&&E(this),A};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=r.getProgramParameter(y,BA)),S},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=HA++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=T,this.fragmentShader=b,this}let ob=0;class ab{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new lb(e),t.set(e,i)),i}}class lb{constructor(e){this.id=ob++,this.code=e,this.usedTimes=0}}function cb(n,e,t,i,r,s,o){const a=new oh,l=new ab,c=new Set,u=[],h=r.logarithmicDepthBuffer,p=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(A){return c.add(A),A===0?"uv":`uv${A}`}function m(A,S,D,B,L){const V=B.fog,j=L.geometry,Q=A.isMeshStandardMaterial?B.environment:null,$=(A.isMeshStandardMaterial?t:e).get(A.envMap||Q),F=$&&$.mapping===Cc?$.image.height:null,H=g[A.type];A.precision!==null&&(f=r.getMaxPrecision(A.precision),f!==A.precision&&console.warn("THREE.WebGLProgram.getParameters:",A.precision,"not supported, using",f,"instead."));const W=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,z=W!==void 0?W.length:0;let re=0;j.morphAttributes.position!==void 0&&(re=1),j.morphAttributes.normal!==void 0&&(re=2),j.morphAttributes.color!==void 0&&(re=3);let K,k,I,ne;if(H){const et=oi[H];K=et.vertexShader,k=et.fragmentShader}else K=A.vertexShader,k=A.fragmentShader,l.update(A),I=l.getVertexShaderID(A),ne=l.getFragmentShaderID(A);const ee=n.getRenderTarget(),pe=L.isInstancedMesh===!0,Ee=L.isBatchedMesh===!0,U=!!A.map,Me=!!A.matcap,de=!!$,We=!!A.aoMap,xe=!!A.lightMap,Pe=!!A.bumpMap,Le=!!A.normalMap,De=!!A.displacementMap,rt=!!A.emissiveMap,N=!!A.metalnessMap,C=!!A.roughnessMap,Y=A.anisotropy>0,se=A.clearcoat>0,le=A.dispersion>0,ce=A.iridescence>0,Ce=A.sheen>0,ve=A.transmission>0,ge=Y&&!!A.anisotropyMap,Ue=se&&!!A.clearcoatMap,he=se&&!!A.clearcoatNormalMap,be=se&&!!A.clearcoatRoughnessMap,Ze=ce&&!!A.iridescenceMap,Ne=ce&&!!A.iridescenceThicknessMap,Se=Ce&&!!A.sheenColorMap,ke=Ce&&!!A.sheenRoughnessMap,Xe=!!A.specularMap,at=!!A.specularColorMap,Ve=!!A.specularIntensityMap,w=ve&&!!A.transmissionMap,G=ve&&!!A.thicknessMap,q=!!A.gradientMap,ae=!!A.alphaMap,fe=A.alphaTest>0,ze=!!A.alphaHash,$e=!!A.extensions;let gt=cr;A.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(gt=n.toneMapping);const Lt={shaderID:H,shaderType:A.type,shaderName:A.name,vertexShader:K,fragmentShader:k,defines:A.defines,customVertexShaderID:I,customFragmentShaderID:ne,isRawShaderMaterial:A.isRawShaderMaterial===!0,glslVersion:A.glslVersion,precision:f,batching:Ee,instancing:pe,instancingColor:pe&&L.instanceColor!==null,instancingMorph:pe&&L.morphTexture!==null,supportsVertexTextures:p,outputColorSpace:ee===null?n.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:yr,alphaToCoverage:!!A.alphaToCoverage,map:U,matcap:Me,envMap:de,envMapMode:de&&$.mapping,envMapCubeUVHeight:F,aoMap:We,lightMap:xe,bumpMap:Pe,normalMap:Le,displacementMap:p&&De,emissiveMap:rt,normalMapObjectSpace:Le&&A.normalMapType===sE,normalMapTangentSpace:Le&&A.normalMapType===C_,metalnessMap:N,roughnessMap:C,anisotropy:Y,anisotropyMap:ge,clearcoat:se,clearcoatMap:Ue,clearcoatNormalMap:he,clearcoatRoughnessMap:be,dispersion:le,iridescence:ce,iridescenceMap:Ze,iridescenceThicknessMap:Ne,sheen:Ce,sheenColorMap:Se,sheenRoughnessMap:ke,specularMap:Xe,specularColorMap:at,specularIntensityMap:Ve,transmission:ve,transmissionMap:w,thicknessMap:G,gradientMap:q,opaque:A.transparent===!1&&A.blending===ks&&A.alphaToCoverage===!1,alphaMap:ae,alphaTest:fe,alphaHash:ze,combine:A.combine,mapUv:U&&y(A.map.channel),aoMapUv:We&&y(A.aoMap.channel),lightMapUv:xe&&y(A.lightMap.channel),bumpMapUv:Pe&&y(A.bumpMap.channel),normalMapUv:Le&&y(A.normalMap.channel),displacementMapUv:De&&y(A.displacementMap.channel),emissiveMapUv:rt&&y(A.emissiveMap.channel),metalnessMapUv:N&&y(A.metalnessMap.channel),roughnessMapUv:C&&y(A.roughnessMap.channel),anisotropyMapUv:ge&&y(A.anisotropyMap.channel),clearcoatMapUv:Ue&&y(A.clearcoatMap.channel),clearcoatNormalMapUv:he&&y(A.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&y(A.clearcoatRoughnessMap.channel),iridescenceMapUv:Ze&&y(A.iridescenceMap.channel),iridescenceThicknessMapUv:Ne&&y(A.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&y(A.sheenColorMap.channel),sheenRoughnessMapUv:ke&&y(A.sheenRoughnessMap.channel),specularMapUv:Xe&&y(A.specularMap.channel),specularColorMapUv:at&&y(A.specularColorMap.channel),specularIntensityMapUv:Ve&&y(A.specularIntensityMap.channel),transmissionMapUv:w&&y(A.transmissionMap.channel),thicknessMapUv:G&&y(A.thicknessMap.channel),alphaMapUv:ae&&y(A.alphaMap.channel),vertexTangents:!!j.attributes.tangent&&(Le||Y),vertexColors:A.vertexColors,vertexAlphas:A.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,pointsUvs:L.isPoints===!0&&!!j.attributes.uv&&(U||ae),fog:!!V,useFog:A.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:A.flatShading===!0,sizeAttenuation:A.sizeAttenuation===!0,logarithmicDepthBuffer:h,skinning:L.isSkinnedMesh===!0,morphTargets:j.morphAttributes.position!==void 0,morphNormals:j.morphAttributes.normal!==void 0,morphColors:j.morphAttributes.color!==void 0,morphTargetsCount:z,morphTextureStride:re,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:A.dithering,shadowMapEnabled:n.shadowMap.enabled&&D.length>0,shadowMapType:n.shadowMap.type,toneMapping:gt,useLegacyLights:n._useLegacyLights,decodeVideoTexture:U&&A.map.isVideoTexture===!0&&st.getTransfer(A.map.colorSpace)===lt,premultipliedAlpha:A.premultipliedAlpha,doubleSided:A.side===Un,flipSided:A.side===hn,useDepthPacking:A.depthPacking>=0,depthPacking:A.depthPacking||0,index0AttributeName:A.index0AttributeName,extensionClipCullDistance:$e&&A.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:$e&&A.extensions.multiDraw===!0&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:A.customProgramCacheKey()};return Lt.vertexUv1s=c.has(1),Lt.vertexUv2s=c.has(2),Lt.vertexUv3s=c.has(3),c.clear(),Lt}function d(A){const S=[];if(A.shaderID?S.push(A.shaderID):(S.push(A.customVertexShaderID),S.push(A.customFragmentShaderID)),A.defines!==void 0)for(const D in A.defines)S.push(D),S.push(A.defines[D]);return A.isRawShaderMaterial===!1&&(v(S,A),_(S,A),S.push(n.outputColorSpace)),S.push(A.customProgramCacheKey),S.join()}function v(A,S){A.push(S.precision),A.push(S.outputColorSpace),A.push(S.envMapMode),A.push(S.envMapCubeUVHeight),A.push(S.mapUv),A.push(S.alphaMapUv),A.push(S.lightMapUv),A.push(S.aoMapUv),A.push(S.bumpMapUv),A.push(S.normalMapUv),A.push(S.displacementMapUv),A.push(S.emissiveMapUv),A.push(S.metalnessMapUv),A.push(S.roughnessMapUv),A.push(S.anisotropyMapUv),A.push(S.clearcoatMapUv),A.push(S.clearcoatNormalMapUv),A.push(S.clearcoatRoughnessMapUv),A.push(S.iridescenceMapUv),A.push(S.iridescenceThicknessMapUv),A.push(S.sheenColorMapUv),A.push(S.sheenRoughnessMapUv),A.push(S.specularMapUv),A.push(S.specularColorMapUv),A.push(S.specularIntensityMapUv),A.push(S.transmissionMapUv),A.push(S.thicknessMapUv),A.push(S.combine),A.push(S.fogExp2),A.push(S.sizeAttenuation),A.push(S.morphTargetsCount),A.push(S.morphAttributeCount),A.push(S.numDirLights),A.push(S.numPointLights),A.push(S.numSpotLights),A.push(S.numSpotLightMaps),A.push(S.numHemiLights),A.push(S.numRectAreaLights),A.push(S.numDirLightShadows),A.push(S.numPointLightShadows),A.push(S.numSpotLightShadows),A.push(S.numSpotLightShadowsWithMaps),A.push(S.numLightProbes),A.push(S.shadowMapType),A.push(S.toneMapping),A.push(S.numClippingPlanes),A.push(S.numClipIntersection),A.push(S.depthPacking)}function _(A,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),A.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.skinning&&a.enable(4),S.morphTargets&&a.enable(5),S.morphNormals&&a.enable(6),S.morphColors&&a.enable(7),S.premultipliedAlpha&&a.enable(8),S.shadowMapEnabled&&a.enable(9),S.useLegacyLights&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.alphaToCoverage&&a.enable(20),A.push(a.mask)}function M(A){const S=g[A.type];let D;if(S){const B=oi[S];D=pa.clone(B.uniforms)}else D=A.uniforms;return D}function T(A,S){let D;for(let B=0,L=u.length;B<L;B++){const V=u[B];if(V.cacheKey===S){D=V,++D.usedTimes;break}}return D===void 0&&(D=new sb(n,S,A,s),u.push(D)),D}function b(A){if(--A.usedTimes===0){const S=u.indexOf(A);u[S]=u[u.length-1],u.pop(),A.destroy()}}function E(A){l.remove(A)}function P(){l.dispose()}return{getParameters:m,getProgramCacheKey:d,getUniforms:M,acquireProgram:T,releaseProgram:b,releaseShaderCache:E,programs:u,dispose:P}}function ub(){let n=new WeakMap;function e(s){let o=n.get(s);return o===void 0&&(o={},n.set(s,o)),o}function t(s){n.delete(s)}function i(s,o,a){n.get(s)[o]=a}function r(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function db(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function ng(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function ig(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(h,p,f,g,y,m){let d=n[e];return d===void 0?(d={id:h.id,object:h,geometry:p,material:f,groupOrder:g,renderOrder:h.renderOrder,z:y,group:m},n[e]=d):(d.id=h.id,d.object=h,d.geometry=p,d.material=f,d.groupOrder=g,d.renderOrder=h.renderOrder,d.z=y,d.group=m),e++,d}function a(h,p,f,g,y,m){const d=o(h,p,f,g,y,m);f.transmission>0?i.push(d):f.transparent===!0?r.push(d):t.push(d)}function l(h,p,f,g,y,m){const d=o(h,p,f,g,y,m);f.transmission>0?i.unshift(d):f.transparent===!0?r.unshift(d):t.unshift(d)}function c(h,p){t.length>1&&t.sort(h||db),i.length>1&&i.sort(p||ng),r.length>1&&r.sort(p||ng)}function u(){for(let h=e,p=n.length;h<p;h++){const f=n[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:a,unshift:l,finish:u,sort:c}}function fb(){let n=new WeakMap;function e(i,r){const s=n.get(i);let o;return s===void 0?(o=new ig,n.set(i,[o])):r>=s.length?(o=new ig,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function hb(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new He};break;case"SpotLight":t={position:new O,direction:new O,color:new He,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new He,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new He,groundColor:new He};break;case"RectAreaLight":t={color:new He,position:new O,halfWidth:new O,halfHeight:new O};break}return n[e.id]=t,t}}}function pb(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let mb=0;function gb(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function vb(n){const e=new hb,t=pb(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new O);const r=new O,s=new Qe,o=new Qe;function a(c,u){let h=0,p=0,f=0;for(let D=0;D<9;D++)i.probe[D].set(0,0,0);let g=0,y=0,m=0,d=0,v=0,_=0,M=0,T=0,b=0,E=0,P=0;c.sort(gb);const A=u===!0?Math.PI:1;for(let D=0,B=c.length;D<B;D++){const L=c[D],V=L.color,j=L.intensity,Q=L.distance,$=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)h+=V.r*j*A,p+=V.g*j*A,f+=V.b*j*A;else if(L.isLightProbe){for(let F=0;F<9;F++)i.probe[F].addScaledVector(L.sh.coefficients[F],j);P++}else if(L.isDirectionalLight){const F=e.get(L);if(F.color.copy(L.color).multiplyScalar(L.intensity*A),L.castShadow){const H=L.shadow,W=t.get(L);W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,i.directionalShadow[g]=W,i.directionalShadowMap[g]=$,i.directionalShadowMatrix[g]=L.shadow.matrix,_++}i.directional[g]=F,g++}else if(L.isSpotLight){const F=e.get(L);F.position.setFromMatrixPosition(L.matrixWorld),F.color.copy(V).multiplyScalar(j*A),F.distance=Q,F.coneCos=Math.cos(L.angle),F.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),F.decay=L.decay,i.spot[m]=F;const H=L.shadow;if(L.map&&(i.spotLightMap[b]=L.map,b++,H.updateMatrices(L),L.castShadow&&E++),i.spotLightMatrix[m]=H.matrix,L.castShadow){const W=t.get(L);W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,i.spotShadow[m]=W,i.spotShadowMap[m]=$,T++}m++}else if(L.isRectAreaLight){const F=e.get(L);F.color.copy(V).multiplyScalar(j),F.halfWidth.set(L.width*.5,0,0),F.halfHeight.set(0,L.height*.5,0),i.rectArea[d]=F,d++}else if(L.isPointLight){const F=e.get(L);if(F.color.copy(L.color).multiplyScalar(L.intensity*A),F.distance=L.distance,F.decay=L.decay,L.castShadow){const H=L.shadow,W=t.get(L);W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,W.shadowCameraNear=H.camera.near,W.shadowCameraFar=H.camera.far,i.pointShadow[y]=W,i.pointShadowMap[y]=$,i.pointShadowMatrix[y]=L.shadow.matrix,M++}i.point[y]=F,y++}else if(L.isHemisphereLight){const F=e.get(L);F.skyColor.copy(L.color).multiplyScalar(j*A),F.groundColor.copy(L.groundColor).multiplyScalar(j*A),i.hemi[v]=F,v++}}d>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=me.LTC_FLOAT_1,i.rectAreaLTC2=me.LTC_FLOAT_2):(i.rectAreaLTC1=me.LTC_HALF_1,i.rectAreaLTC2=me.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=p,i.ambient[2]=f;const S=i.hash;(S.directionalLength!==g||S.pointLength!==y||S.spotLength!==m||S.rectAreaLength!==d||S.hemiLength!==v||S.numDirectionalShadows!==_||S.numPointShadows!==M||S.numSpotShadows!==T||S.numSpotMaps!==b||S.numLightProbes!==P)&&(i.directional.length=g,i.spot.length=m,i.rectArea.length=d,i.point.length=y,i.hemi.length=v,i.directionalShadow.length=_,i.directionalShadowMap.length=_,i.pointShadow.length=M,i.pointShadowMap.length=M,i.spotShadow.length=T,i.spotShadowMap.length=T,i.directionalShadowMatrix.length=_,i.pointShadowMatrix.length=M,i.spotLightMatrix.length=T+b-E,i.spotLightMap.length=b,i.numSpotLightShadowsWithMaps=E,i.numLightProbes=P,S.directionalLength=g,S.pointLength=y,S.spotLength=m,S.rectAreaLength=d,S.hemiLength=v,S.numDirectionalShadows=_,S.numPointShadows=M,S.numSpotShadows=T,S.numSpotMaps=b,S.numLightProbes=P,i.version=mb++)}function l(c,u){let h=0,p=0,f=0,g=0,y=0;const m=u.matrixWorldInverse;for(let d=0,v=c.length;d<v;d++){const _=c[d];if(_.isDirectionalLight){const M=i.directional[h];M.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),h++}else if(_.isSpotLight){const M=i.spot[f];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),f++}else if(_.isRectAreaLight){const M=i.rectArea[g];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),o.identity(),s.copy(_.matrixWorld),s.premultiply(m),o.extractRotation(s),M.halfWidth.set(_.width*.5,0,0),M.halfHeight.set(0,_.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const M=i.point[p];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(m),p++}else if(_.isHemisphereLight){const M=i.hemi[y];M.direction.setFromMatrixPosition(_.matrixWorld),M.direction.transformDirection(m),y++}}}return{setup:a,setupView:l,state:i}}function rg(n){const e=new vb(n),t=[],i=[];function r(u){c.camera=u,t.length=0,i.length=0}function s(u){t.push(u)}function o(u){i.push(u)}function a(u){e.setup(t,u)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function _b(n){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new rg(n),e.set(r,[a])):s>=o.length?(a=new rg(n),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:t,dispose:i}}class xb extends Ma{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=iE,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class yb extends Ma{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Mb=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Sb=`uniform sampler2D shadow_pass;
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
}`;function Eb(n,e,t){let i=new ah;const r=new we,s=new we,o=new Ut,a=new xb({depthPacking:rE}),l=new yb,c={},u=t.maxTextureSize,h={[hr]:hn,[hn]:hr,[Un]:Un},p=new Vt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:Mb,fragmentShader:Sb}),f=p.clone();f.defines.HORIZONTAL_PASS=1;const g=new ii;g.setAttribute("position",new Ht(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const y=new At(g,p),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=d_;let d=this.type;this.render=function(b,E,P){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;const A=n.getRenderTarget(),S=n.getActiveCubeFace(),D=n.getActiveMipmapLevel(),B=n.state;B.setBlending(Ci),B.buffers.color.setClear(1,1,1,1),B.buffers.depth.setTest(!0),B.setScissorTest(!1);const L=d!==yi&&this.type===yi,V=d===yi&&this.type!==yi;for(let j=0,Q=b.length;j<Q;j++){const $=b[j],F=$.shadow;if(F===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;r.copy(F.mapSize);const H=F.getFrameExtents();if(r.multiply(H),s.copy(F.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/H.x),r.x=s.x*H.x,F.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/H.y),r.y=s.y*H.y,F.mapSize.y=s.y)),F.map===null||L===!0||V===!0){const z=this.type!==yi?{minFilter:Sn,magFilter:Sn}:{};F.map!==null&&F.map.dispose(),F.map=new ti(r.x,r.y,z),F.map.texture.name=$.name+".shadowMap",F.camera.updateProjectionMatrix()}n.setRenderTarget(F.map),n.clear();const W=F.getViewportCount();for(let z=0;z<W;z++){const re=F.getViewport(z);o.set(s.x*re.x,s.y*re.y,s.x*re.z,s.y*re.w),B.viewport(o),F.updateMatrices($,z),i=F.getFrustum(),M(E,P,F.camera,$,this.type)}F.isPointLightShadow!==!0&&this.type===yi&&v(F,P),F.needsUpdate=!1}d=this.type,m.needsUpdate=!1,n.setRenderTarget(A,S,D)};function v(b,E){const P=e.update(y);p.defines.VSM_SAMPLES!==b.blurSamples&&(p.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,p.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new ti(r.x,r.y)),p.uniforms.shadow_pass.value=b.map.texture,p.uniforms.resolution.value=b.mapSize,p.uniforms.radius.value=b.radius,n.setRenderTarget(b.mapPass),n.clear(),n.renderBufferDirect(E,null,P,p,y,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,n.setRenderTarget(b.map),n.clear(),n.renderBufferDirect(E,null,P,f,y,null)}function _(b,E,P,A){let S=null;const D=P.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(D!==void 0)S=D;else if(S=P.isPointLight===!0?l:a,n.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){const B=S.uuid,L=E.uuid;let V=c[B];V===void 0&&(V={},c[B]=V);let j=V[L];j===void 0&&(j=S.clone(),V[L]=j,E.addEventListener("dispose",T)),S=j}if(S.visible=E.visible,S.wireframe=E.wireframe,A===yi?S.side=E.shadowSide!==null?E.shadowSide:E.side:S.side=E.shadowSide!==null?E.shadowSide:h[E.side],S.alphaMap=E.alphaMap,S.alphaTest=E.alphaTest,S.map=E.map,S.clipShadows=E.clipShadows,S.clippingPlanes=E.clippingPlanes,S.clipIntersection=E.clipIntersection,S.displacementMap=E.displacementMap,S.displacementScale=E.displacementScale,S.displacementBias=E.displacementBias,S.wireframeLinewidth=E.wireframeLinewidth,S.linewidth=E.linewidth,P.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const B=n.properties.get(S);B.light=P}return S}function M(b,E,P,A,S){if(b.visible===!1)return;if(b.layers.test(E.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&S===yi)&&(!b.frustumCulled||i.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,b.matrixWorld);const L=e.update(b),V=b.material;if(Array.isArray(V)){const j=L.groups;for(let Q=0,$=j.length;Q<$;Q++){const F=j[Q],H=V[F.materialIndex];if(H&&H.visible){const W=_(b,H,A,S);b.onBeforeShadow(n,b,E,P,L,W,F),n.renderBufferDirect(P,null,L,W,b,F),b.onAfterShadow(n,b,E,P,L,W,F)}}}else if(V.visible){const j=_(b,V,A,S);b.onBeforeShadow(n,b,E,P,L,j,null),n.renderBufferDirect(P,null,L,j,b,null),b.onAfterShadow(n,b,E,P,L,j,null)}}const B=b.children;for(let L=0,V=B.length;L<V;L++)M(B[L],E,P,A,S)}function T(b){b.target.removeEventListener("dispose",T);for(const P in c){const A=c[P],S=b.target.uuid;S in A&&(A[S].dispose(),delete A[S])}}}function wb(n){function e(){let w=!1;const G=new Ut;let q=null;const ae=new Ut(0,0,0,0);return{setMask:function(fe){q!==fe&&!w&&(n.colorMask(fe,fe,fe,fe),q=fe)},setLocked:function(fe){w=fe},setClear:function(fe,ze,$e,gt,Lt){Lt===!0&&(fe*=gt,ze*=gt,$e*=gt),G.set(fe,ze,$e,gt),ae.equals(G)===!1&&(n.clearColor(fe,ze,$e,gt),ae.copy(G))},reset:function(){w=!1,q=null,ae.set(-1,0,0,0)}}}function t(){let w=!1,G=null,q=null,ae=null;return{setTest:function(fe){fe?ne(n.DEPTH_TEST):ee(n.DEPTH_TEST)},setMask:function(fe){G!==fe&&!w&&(n.depthMask(fe),G=fe)},setFunc:function(fe){if(q!==fe){switch(fe){case US:n.depthFunc(n.NEVER);break;case FS:n.depthFunc(n.ALWAYS);break;case OS:n.depthFunc(n.LESS);break;case Ql:n.depthFunc(n.LEQUAL);break;case kS:n.depthFunc(n.EQUAL);break;case zS:n.depthFunc(n.GEQUAL);break;case BS:n.depthFunc(n.GREATER);break;case HS:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}q=fe}},setLocked:function(fe){w=fe},setClear:function(fe){ae!==fe&&(n.clearDepth(fe),ae=fe)},reset:function(){w=!1,G=null,q=null,ae=null}}}function i(){let w=!1,G=null,q=null,ae=null,fe=null,ze=null,$e=null,gt=null,Lt=null;return{setTest:function(et){w||(et?ne(n.STENCIL_TEST):ee(n.STENCIL_TEST))},setMask:function(et){G!==et&&!w&&(n.stencilMask(et),G=et)},setFunc:function(et,Et,dt){(q!==et||ae!==Et||fe!==dt)&&(n.stencilFunc(et,Et,dt),q=et,ae=Et,fe=dt)},setOp:function(et,Et,dt){(ze!==et||$e!==Et||gt!==dt)&&(n.stencilOp(et,Et,dt),ze=et,$e=Et,gt=dt)},setLocked:function(et){w=et},setClear:function(et){Lt!==et&&(n.clearStencil(et),Lt=et)},reset:function(){w=!1,G=null,q=null,ae=null,fe=null,ze=null,$e=null,gt=null,Lt=null}}}const r=new e,s=new t,o=new i,a=new WeakMap,l=new WeakMap;let c={},u={},h=new WeakMap,p=[],f=null,g=!1,y=null,m=null,d=null,v=null,_=null,M=null,T=null,b=new He(0,0,0),E=0,P=!1,A=null,S=null,D=null,B=null,L=null;const V=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let j=!1,Q=0;const $=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(Q=parseFloat(/^WebGL (\d)/.exec($)[1]),j=Q>=1):$.indexOf("OpenGL ES")!==-1&&(Q=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),j=Q>=2);let F=null,H={};const W=n.getParameter(n.SCISSOR_BOX),z=n.getParameter(n.VIEWPORT),re=new Ut().fromArray(W),K=new Ut().fromArray(z);function k(w,G,q,ae){const fe=new Uint8Array(4),ze=n.createTexture();n.bindTexture(w,ze),n.texParameteri(w,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(w,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let $e=0;$e<q;$e++)w===n.TEXTURE_3D||w===n.TEXTURE_2D_ARRAY?n.texImage3D(G,0,n.RGBA,1,1,ae,0,n.RGBA,n.UNSIGNED_BYTE,fe):n.texImage2D(G+$e,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,fe);return ze}const I={};I[n.TEXTURE_2D]=k(n.TEXTURE_2D,n.TEXTURE_2D,1),I[n.TEXTURE_CUBE_MAP]=k(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),I[n.TEXTURE_2D_ARRAY]=k(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),I[n.TEXTURE_3D]=k(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),o.setClear(0),ne(n.DEPTH_TEST),s.setFunc(Ql),Pe(!1),Le(zp),ne(n.CULL_FACE),We(Ci);function ne(w){c[w]!==!0&&(n.enable(w),c[w]=!0)}function ee(w){c[w]!==!1&&(n.disable(w),c[w]=!1)}function pe(w,G){return u[w]!==G?(n.bindFramebuffer(w,G),u[w]=G,w===n.DRAW_FRAMEBUFFER&&(u[n.FRAMEBUFFER]=G),w===n.FRAMEBUFFER&&(u[n.DRAW_FRAMEBUFFER]=G),!0):!1}function Ee(w,G){let q=p,ae=!1;if(w){q=h.get(G),q===void 0&&(q=[],h.set(G,q));const fe=w.textures;if(q.length!==fe.length||q[0]!==n.COLOR_ATTACHMENT0){for(let ze=0,$e=fe.length;ze<$e;ze++)q[ze]=n.COLOR_ATTACHMENT0+ze;q.length=fe.length,ae=!0}}else q[0]!==n.BACK&&(q[0]=n.BACK,ae=!0);ae&&n.drawBuffers(q)}function U(w){return f!==w?(n.useProgram(w),f=w,!0):!1}const Me={[Lr]:n.FUNC_ADD,[_S]:n.FUNC_SUBTRACT,[xS]:n.FUNC_REVERSE_SUBTRACT};Me[yS]=n.MIN,Me[MS]=n.MAX;const de={[SS]:n.ZERO,[ES]:n.ONE,[wS]:n.SRC_COLOR,[Kd]:n.SRC_ALPHA,[PS]:n.SRC_ALPHA_SATURATE,[CS]:n.DST_COLOR,[AS]:n.DST_ALPHA,[TS]:n.ONE_MINUS_SRC_COLOR,[Zd]:n.ONE_MINUS_SRC_ALPHA,[RS]:n.ONE_MINUS_DST_COLOR,[bS]:n.ONE_MINUS_DST_ALPHA,[NS]:n.CONSTANT_COLOR,[LS]:n.ONE_MINUS_CONSTANT_COLOR,[IS]:n.CONSTANT_ALPHA,[DS]:n.ONE_MINUS_CONSTANT_ALPHA};function We(w,G,q,ae,fe,ze,$e,gt,Lt,et){if(w===Ci){g===!0&&(ee(n.BLEND),g=!1);return}if(g===!1&&(ne(n.BLEND),g=!0),w!==vS){if(w!==y||et!==P){if((m!==Lr||_!==Lr)&&(n.blendEquation(n.FUNC_ADD),m=Lr,_=Lr),et)switch(w){case ks:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case qd:n.blendFunc(n.ONE,n.ONE);break;case Bp:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Hp:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",w);break}else switch(w){case ks:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case qd:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case Bp:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Hp:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",w);break}d=null,v=null,M=null,T=null,b.set(0,0,0),E=0,y=w,P=et}return}fe=fe||G,ze=ze||q,$e=$e||ae,(G!==m||fe!==_)&&(n.blendEquationSeparate(Me[G],Me[fe]),m=G,_=fe),(q!==d||ae!==v||ze!==M||$e!==T)&&(n.blendFuncSeparate(de[q],de[ae],de[ze],de[$e]),d=q,v=ae,M=ze,T=$e),(gt.equals(b)===!1||Lt!==E)&&(n.blendColor(gt.r,gt.g,gt.b,Lt),b.copy(gt),E=Lt),y=w,P=!1}function xe(w,G){w.side===Un?ee(n.CULL_FACE):ne(n.CULL_FACE);let q=w.side===hn;G&&(q=!q),Pe(q),w.blending===ks&&w.transparent===!1?We(Ci):We(w.blending,w.blendEquation,w.blendSrc,w.blendDst,w.blendEquationAlpha,w.blendSrcAlpha,w.blendDstAlpha,w.blendColor,w.blendAlpha,w.premultipliedAlpha),s.setFunc(w.depthFunc),s.setTest(w.depthTest),s.setMask(w.depthWrite),r.setMask(w.colorWrite);const ae=w.stencilWrite;o.setTest(ae),ae&&(o.setMask(w.stencilWriteMask),o.setFunc(w.stencilFunc,w.stencilRef,w.stencilFuncMask),o.setOp(w.stencilFail,w.stencilZFail,w.stencilZPass)),rt(w.polygonOffset,w.polygonOffsetFactor,w.polygonOffsetUnits),w.alphaToCoverage===!0?ne(n.SAMPLE_ALPHA_TO_COVERAGE):ee(n.SAMPLE_ALPHA_TO_COVERAGE)}function Pe(w){A!==w&&(w?n.frontFace(n.CW):n.frontFace(n.CCW),A=w)}function Le(w){w!==mS?(ne(n.CULL_FACE),w!==S&&(w===zp?n.cullFace(n.BACK):w===gS?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):ee(n.CULL_FACE),S=w}function De(w){w!==D&&(j&&n.lineWidth(w),D=w)}function rt(w,G,q){w?(ne(n.POLYGON_OFFSET_FILL),(B!==G||L!==q)&&(n.polygonOffset(G,q),B=G,L=q)):ee(n.POLYGON_OFFSET_FILL)}function N(w){w?ne(n.SCISSOR_TEST):ee(n.SCISSOR_TEST)}function C(w){w===void 0&&(w=n.TEXTURE0+V-1),F!==w&&(n.activeTexture(w),F=w)}function Y(w,G,q){q===void 0&&(F===null?q=n.TEXTURE0+V-1:q=F);let ae=H[q];ae===void 0&&(ae={type:void 0,texture:void 0},H[q]=ae),(ae.type!==w||ae.texture!==G)&&(F!==q&&(n.activeTexture(q),F=q),n.bindTexture(w,G||I[w]),ae.type=w,ae.texture=G)}function se(){const w=H[F];w!==void 0&&w.type!==void 0&&(n.bindTexture(w.type,null),w.type=void 0,w.texture=void 0)}function le(){try{n.compressedTexImage2D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function ce(){try{n.compressedTexImage3D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function Ce(){try{n.texSubImage2D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function ve(){try{n.texSubImage3D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function ge(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function Ue(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function he(){try{n.texStorage2D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function be(){try{n.texStorage3D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function Ze(){try{n.texImage2D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function Ne(){try{n.texImage3D.apply(n,arguments)}catch(w){console.error("THREE.WebGLState:",w)}}function Se(w){re.equals(w)===!1&&(n.scissor(w.x,w.y,w.z,w.w),re.copy(w))}function ke(w){K.equals(w)===!1&&(n.viewport(w.x,w.y,w.z,w.w),K.copy(w))}function Xe(w,G){let q=l.get(G);q===void 0&&(q=new WeakMap,l.set(G,q));let ae=q.get(w);ae===void 0&&(ae=n.getUniformBlockIndex(G,w.name),q.set(w,ae))}function at(w,G){const ae=l.get(G).get(w);a.get(G)!==ae&&(n.uniformBlockBinding(G,ae,w.__bindingPointIndex),a.set(G,ae))}function Ve(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),c={},F=null,H={},u={},h=new WeakMap,p=[],f=null,g=!1,y=null,m=null,d=null,v=null,_=null,M=null,T=null,b=new He(0,0,0),E=0,P=!1,A=null,S=null,D=null,B=null,L=null,re.set(0,0,n.canvas.width,n.canvas.height),K.set(0,0,n.canvas.width,n.canvas.height),r.reset(),s.reset(),o.reset()}return{buffers:{color:r,depth:s,stencil:o},enable:ne,disable:ee,bindFramebuffer:pe,drawBuffers:Ee,useProgram:U,setBlending:We,setMaterial:xe,setFlipSided:Pe,setCullFace:Le,setLineWidth:De,setPolygonOffset:rt,setScissorTest:N,activeTexture:C,bindTexture:Y,unbindTexture:se,compressedTexImage2D:le,compressedTexImage3D:ce,texImage2D:Ze,texImage3D:Ne,updateUBOMapping:Xe,uniformBlockBinding:at,texStorage2D:he,texStorage3D:be,texSubImage2D:Ce,texSubImage3D:ve,compressedTexSubImage2D:ge,compressedTexSubImage3D:Ue,scissor:Se,viewport:ke,reset:Ve}}function Tb(n,e,t,i,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new we,u=new WeakMap;let h;const p=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(N,C){return f?new OffscreenCanvas(N,C):oc("canvas")}function y(N,C,Y){let se=1;const le=rt(N);if((le.width>Y||le.height>Y)&&(se=Y/Math.max(le.width,le.height)),se<1)if(typeof HTMLImageElement<"u"&&N instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&N instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&N instanceof ImageBitmap||typeof VideoFrame<"u"&&N instanceof VideoFrame){const ce=Math.floor(se*le.width),Ce=Math.floor(se*le.height);h===void 0&&(h=g(ce,Ce));const ve=C?g(ce,Ce):h;return ve.width=ce,ve.height=Ce,ve.getContext("2d").drawImage(N,0,0,ce,Ce),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+le.width+"x"+le.height+") to ("+ce+"x"+Ce+")."),ve}else return"data"in N&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+le.width+"x"+le.height+")."),N;return N}function m(N){return N.generateMipmaps&&N.minFilter!==Sn&&N.minFilter!==Fn}function d(N){n.generateMipmap(N)}function v(N,C,Y,se,le=!1){if(N!==null){if(n[N]!==void 0)return n[N];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+N+"'")}let ce=C;if(C===n.RED&&(Y===n.FLOAT&&(ce=n.R32F),Y===n.HALF_FLOAT&&(ce=n.R16F),Y===n.UNSIGNED_BYTE&&(ce=n.R8)),C===n.RED_INTEGER&&(Y===n.UNSIGNED_BYTE&&(ce=n.R8UI),Y===n.UNSIGNED_SHORT&&(ce=n.R16UI),Y===n.UNSIGNED_INT&&(ce=n.R32UI),Y===n.BYTE&&(ce=n.R8I),Y===n.SHORT&&(ce=n.R16I),Y===n.INT&&(ce=n.R32I)),C===n.RG&&(Y===n.FLOAT&&(ce=n.RG32F),Y===n.HALF_FLOAT&&(ce=n.RG16F),Y===n.UNSIGNED_BYTE&&(ce=n.RG8)),C===n.RG_INTEGER&&(Y===n.UNSIGNED_BYTE&&(ce=n.RG8UI),Y===n.UNSIGNED_SHORT&&(ce=n.RG16UI),Y===n.UNSIGNED_INT&&(ce=n.RG32UI),Y===n.BYTE&&(ce=n.RG8I),Y===n.SHORT&&(ce=n.RG16I),Y===n.INT&&(ce=n.RG32I)),C===n.RGB&&Y===n.UNSIGNED_INT_5_9_9_9_REV&&(ce=n.RGB9_E5),C===n.RGBA){const Ce=le?nc:st.getTransfer(se);Y===n.FLOAT&&(ce=n.RGBA32F),Y===n.HALF_FLOAT&&(ce=n.RGBA16F),Y===n.UNSIGNED_BYTE&&(ce=Ce===lt?n.SRGB8_ALPHA8:n.RGBA8),Y===n.UNSIGNED_SHORT_4_4_4_4&&(ce=n.RGBA4),Y===n.UNSIGNED_SHORT_5_5_5_1&&(ce=n.RGB5_A1)}return(ce===n.R16F||ce===n.R32F||ce===n.RG16F||ce===n.RG32F||ce===n.RGBA16F||ce===n.RGBA32F)&&e.get("EXT_color_buffer_float"),ce}function _(N,C){return m(N)===!0||N.isFramebufferTexture&&N.minFilter!==Sn&&N.minFilter!==Fn?Math.log2(Math.max(C.width,C.height))+1:N.mipmaps!==void 0&&N.mipmaps.length>0?N.mipmaps.length:N.isCompressedTexture&&Array.isArray(N.image)?C.mipmaps.length:1}function M(N){const C=N.target;C.removeEventListener("dispose",M),b(C),C.isVideoTexture&&u.delete(C)}function T(N){const C=N.target;C.removeEventListener("dispose",T),P(C)}function b(N){const C=i.get(N);if(C.__webglInit===void 0)return;const Y=N.source,se=p.get(Y);if(se){const le=se[C.__cacheKey];le.usedTimes--,le.usedTimes===0&&E(N),Object.keys(se).length===0&&p.delete(Y)}i.remove(N)}function E(N){const C=i.get(N);n.deleteTexture(C.__webglTexture);const Y=N.source,se=p.get(Y);delete se[C.__cacheKey],o.memory.textures--}function P(N){const C=i.get(N);if(N.depthTexture&&N.depthTexture.dispose(),N.isWebGLCubeRenderTarget)for(let se=0;se<6;se++){if(Array.isArray(C.__webglFramebuffer[se]))for(let le=0;le<C.__webglFramebuffer[se].length;le++)n.deleteFramebuffer(C.__webglFramebuffer[se][le]);else n.deleteFramebuffer(C.__webglFramebuffer[se]);C.__webglDepthbuffer&&n.deleteRenderbuffer(C.__webglDepthbuffer[se])}else{if(Array.isArray(C.__webglFramebuffer))for(let se=0;se<C.__webglFramebuffer.length;se++)n.deleteFramebuffer(C.__webglFramebuffer[se]);else n.deleteFramebuffer(C.__webglFramebuffer);if(C.__webglDepthbuffer&&n.deleteRenderbuffer(C.__webglDepthbuffer),C.__webglMultisampledFramebuffer&&n.deleteFramebuffer(C.__webglMultisampledFramebuffer),C.__webglColorRenderbuffer)for(let se=0;se<C.__webglColorRenderbuffer.length;se++)C.__webglColorRenderbuffer[se]&&n.deleteRenderbuffer(C.__webglColorRenderbuffer[se]);C.__webglDepthRenderbuffer&&n.deleteRenderbuffer(C.__webglDepthRenderbuffer)}const Y=N.textures;for(let se=0,le=Y.length;se<le;se++){const ce=i.get(Y[se]);ce.__webglTexture&&(n.deleteTexture(ce.__webglTexture),o.memory.textures--),i.remove(Y[se])}i.remove(N)}let A=0;function S(){A=0}function D(){const N=A;return N>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+N+" texture units while this GPU supports only "+r.maxTextures),A+=1,N}function B(N){const C=[];return C.push(N.wrapS),C.push(N.wrapT),C.push(N.wrapR||0),C.push(N.magFilter),C.push(N.minFilter),C.push(N.anisotropy),C.push(N.internalFormat),C.push(N.format),C.push(N.type),C.push(N.generateMipmaps),C.push(N.premultiplyAlpha),C.push(N.flipY),C.push(N.unpackAlignment),C.push(N.colorSpace),C.join()}function L(N,C){const Y=i.get(N);if(N.isVideoTexture&&Le(N),N.isRenderTargetTexture===!1&&N.version>0&&Y.__version!==N.version){const se=N.image;if(se===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(se.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{re(Y,N,C);return}}t.bindTexture(n.TEXTURE_2D,Y.__webglTexture,n.TEXTURE0+C)}function V(N,C){const Y=i.get(N);if(N.version>0&&Y.__version!==N.version){re(Y,N,C);return}t.bindTexture(n.TEXTURE_2D_ARRAY,Y.__webglTexture,n.TEXTURE0+C)}function j(N,C){const Y=i.get(N);if(N.version>0&&Y.__version!==N.version){re(Y,N,C);return}t.bindTexture(n.TEXTURE_3D,Y.__webglTexture,n.TEXTURE0+C)}function Q(N,C){const Y=i.get(N);if(N.version>0&&Y.__version!==N.version){K(Y,N,C);return}t.bindTexture(n.TEXTURE_CUBE_MAP,Y.__webglTexture,n.TEXTURE0+C)}const $={[ec]:n.REPEAT,[Ji]:n.CLAMP_TO_EDGE,[tc]:n.MIRRORED_REPEAT},F={[Sn]:n.NEAREST,[y_]:n.NEAREST_MIPMAP_NEAREST,[Lo]:n.NEAREST_MIPMAP_LINEAR,[Fn]:n.LINEAR,[Tl]:n.LINEAR_MIPMAP_NEAREST,[Qi]:n.LINEAR_MIPMAP_LINEAR},H={[oE]:n.NEVER,[fE]:n.ALWAYS,[aE]:n.LESS,[R_]:n.LEQUAL,[lE]:n.EQUAL,[dE]:n.GEQUAL,[cE]:n.GREATER,[uE]:n.NOTEQUAL};function W(N,C){if(C.type===er&&e.has("OES_texture_float_linear")===!1&&(C.magFilter===Fn||C.magFilter===Tl||C.magFilter===Lo||C.magFilter===Qi||C.minFilter===Fn||C.minFilter===Tl||C.minFilter===Lo||C.minFilter===Qi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(N,n.TEXTURE_WRAP_S,$[C.wrapS]),n.texParameteri(N,n.TEXTURE_WRAP_T,$[C.wrapT]),(N===n.TEXTURE_3D||N===n.TEXTURE_2D_ARRAY)&&n.texParameteri(N,n.TEXTURE_WRAP_R,$[C.wrapR]),n.texParameteri(N,n.TEXTURE_MAG_FILTER,F[C.magFilter]),n.texParameteri(N,n.TEXTURE_MIN_FILTER,F[C.minFilter]),C.compareFunction&&(n.texParameteri(N,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(N,n.TEXTURE_COMPARE_FUNC,H[C.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(C.magFilter===Sn||C.minFilter!==Lo&&C.minFilter!==Qi||C.type===er&&e.has("OES_texture_float_linear")===!1)return;if(C.anisotropy>1||i.get(C).__currentAnisotropy){const Y=e.get("EXT_texture_filter_anisotropic");n.texParameterf(N,Y.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(C.anisotropy,r.getMaxAnisotropy())),i.get(C).__currentAnisotropy=C.anisotropy}}}function z(N,C){let Y=!1;N.__webglInit===void 0&&(N.__webglInit=!0,C.addEventListener("dispose",M));const se=C.source;let le=p.get(se);le===void 0&&(le={},p.set(se,le));const ce=B(C);if(ce!==N.__cacheKey){le[ce]===void 0&&(le[ce]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,Y=!0),le[ce].usedTimes++;const Ce=le[N.__cacheKey];Ce!==void 0&&(le[N.__cacheKey].usedTimes--,Ce.usedTimes===0&&E(C)),N.__cacheKey=ce,N.__webglTexture=le[ce].texture}return Y}function re(N,C,Y){let se=n.TEXTURE_2D;(C.isDataArrayTexture||C.isCompressedArrayTexture)&&(se=n.TEXTURE_2D_ARRAY),C.isData3DTexture&&(se=n.TEXTURE_3D);const le=z(N,C),ce=C.source;t.bindTexture(se,N.__webglTexture,n.TEXTURE0+Y);const Ce=i.get(ce);if(ce.version!==Ce.__version||le===!0){t.activeTexture(n.TEXTURE0+Y);const ve=st.getPrimaries(st.workingColorSpace),ge=C.colorSpace===Ei?null:st.getPrimaries(C.colorSpace),Ue=C.colorSpace===Ei||ve===ge?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,C.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,C.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ue);let he=y(C.image,!1,r.maxTextureSize);he=De(C,he);const be=s.convert(C.format,C.colorSpace),Ze=s.convert(C.type);let Ne=v(C.internalFormat,be,Ze,C.colorSpace,C.isVideoTexture);W(se,C);let Se;const ke=C.mipmaps,Xe=C.isVideoTexture!==!0,at=Ce.__version===void 0||le===!0,Ve=ce.dataReady,w=_(C,he);if(C.isDepthTexture)Ne=n.DEPTH_COMPONENT16,C.type===er?Ne=n.DEPTH_COMPONENT32F:C.type===Zs?Ne=n.DEPTH_COMPONENT24:C.type===ya&&(Ne=n.DEPTH24_STENCIL8),at&&(Xe?t.texStorage2D(n.TEXTURE_2D,1,Ne,he.width,he.height):t.texImage2D(n.TEXTURE_2D,0,Ne,he.width,he.height,0,be,Ze,null));else if(C.isDataTexture)if(ke.length>0){Xe&&at&&t.texStorage2D(n.TEXTURE_2D,w,Ne,ke[0].width,ke[0].height);for(let G=0,q=ke.length;G<q;G++)Se=ke[G],Xe?Ve&&t.texSubImage2D(n.TEXTURE_2D,G,0,0,Se.width,Se.height,be,Ze,Se.data):t.texImage2D(n.TEXTURE_2D,G,Ne,Se.width,Se.height,0,be,Ze,Se.data);C.generateMipmaps=!1}else Xe?(at&&t.texStorage2D(n.TEXTURE_2D,w,Ne,he.width,he.height),Ve&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,he.width,he.height,be,Ze,he.data)):t.texImage2D(n.TEXTURE_2D,0,Ne,he.width,he.height,0,be,Ze,he.data);else if(C.isCompressedTexture)if(C.isCompressedArrayTexture){Xe&&at&&t.texStorage3D(n.TEXTURE_2D_ARRAY,w,Ne,ke[0].width,ke[0].height,he.depth);for(let G=0,q=ke.length;G<q;G++)Se=ke[G],C.format!==Jn?be!==null?Xe?Ve&&t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,G,0,0,0,Se.width,Se.height,he.depth,be,Se.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,G,Ne,Se.width,Se.height,he.depth,0,Se.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Xe?Ve&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,G,0,0,0,Se.width,Se.height,he.depth,be,Ze,Se.data):t.texImage3D(n.TEXTURE_2D_ARRAY,G,Ne,Se.width,Se.height,he.depth,0,be,Ze,Se.data)}else{Xe&&at&&t.texStorage2D(n.TEXTURE_2D,w,Ne,ke[0].width,ke[0].height);for(let G=0,q=ke.length;G<q;G++)Se=ke[G],C.format!==Jn?be!==null?Xe?Ve&&t.compressedTexSubImage2D(n.TEXTURE_2D,G,0,0,Se.width,Se.height,be,Se.data):t.compressedTexImage2D(n.TEXTURE_2D,G,Ne,Se.width,Se.height,0,Se.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Xe?Ve&&t.texSubImage2D(n.TEXTURE_2D,G,0,0,Se.width,Se.height,be,Ze,Se.data):t.texImage2D(n.TEXTURE_2D,G,Ne,Se.width,Se.height,0,be,Ze,Se.data)}else if(C.isDataArrayTexture)Xe?(at&&t.texStorage3D(n.TEXTURE_2D_ARRAY,w,Ne,he.width,he.height,he.depth),Ve&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,he.width,he.height,he.depth,be,Ze,he.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,Ne,he.width,he.height,he.depth,0,be,Ze,he.data);else if(C.isData3DTexture)Xe?(at&&t.texStorage3D(n.TEXTURE_3D,w,Ne,he.width,he.height,he.depth),Ve&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,he.width,he.height,he.depth,be,Ze,he.data)):t.texImage3D(n.TEXTURE_3D,0,Ne,he.width,he.height,he.depth,0,be,Ze,he.data);else if(C.isFramebufferTexture){if(at)if(Xe)t.texStorage2D(n.TEXTURE_2D,w,Ne,he.width,he.height);else{let G=he.width,q=he.height;for(let ae=0;ae<w;ae++)t.texImage2D(n.TEXTURE_2D,ae,Ne,G,q,0,be,Ze,null),G>>=1,q>>=1}}else if(ke.length>0){if(Xe&&at){const G=rt(ke[0]);t.texStorage2D(n.TEXTURE_2D,w,Ne,G.width,G.height)}for(let G=0,q=ke.length;G<q;G++)Se=ke[G],Xe?Ve&&t.texSubImage2D(n.TEXTURE_2D,G,0,0,be,Ze,Se):t.texImage2D(n.TEXTURE_2D,G,Ne,be,Ze,Se);C.generateMipmaps=!1}else if(Xe){if(at){const G=rt(he);t.texStorage2D(n.TEXTURE_2D,w,Ne,G.width,G.height)}Ve&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,be,Ze,he)}else t.texImage2D(n.TEXTURE_2D,0,Ne,be,Ze,he);m(C)&&d(se),Ce.__version=ce.version,C.onUpdate&&C.onUpdate(C)}N.__version=C.version}function K(N,C,Y){if(C.image.length!==6)return;const se=z(N,C),le=C.source;t.bindTexture(n.TEXTURE_CUBE_MAP,N.__webglTexture,n.TEXTURE0+Y);const ce=i.get(le);if(le.version!==ce.__version||se===!0){t.activeTexture(n.TEXTURE0+Y);const Ce=st.getPrimaries(st.workingColorSpace),ve=C.colorSpace===Ei?null:st.getPrimaries(C.colorSpace),ge=C.colorSpace===Ei||Ce===ve?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,C.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,C.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ge);const Ue=C.isCompressedTexture||C.image[0].isCompressedTexture,he=C.image[0]&&C.image[0].isDataTexture,be=[];for(let q=0;q<6;q++)!Ue&&!he?be[q]=y(C.image[q],!0,r.maxCubemapSize):be[q]=he?C.image[q].image:C.image[q],be[q]=De(C,be[q]);const Ze=be[0],Ne=s.convert(C.format,C.colorSpace),Se=s.convert(C.type),ke=v(C.internalFormat,Ne,Se,C.colorSpace),Xe=C.isVideoTexture!==!0,at=ce.__version===void 0||se===!0,Ve=le.dataReady;let w=_(C,Ze);W(n.TEXTURE_CUBE_MAP,C);let G;if(Ue){Xe&&at&&t.texStorage2D(n.TEXTURE_CUBE_MAP,w,ke,Ze.width,Ze.height);for(let q=0;q<6;q++){G=be[q].mipmaps;for(let ae=0;ae<G.length;ae++){const fe=G[ae];C.format!==Jn?Ne!==null?Xe?Ve&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae,0,0,fe.width,fe.height,Ne,fe.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae,ke,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Xe?Ve&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae,0,0,fe.width,fe.height,Ne,Se,fe.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae,ke,fe.width,fe.height,0,Ne,Se,fe.data)}}}else{if(G=C.mipmaps,Xe&&at){G.length>0&&w++;const q=rt(be[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,w,ke,q.width,q.height)}for(let q=0;q<6;q++)if(he){Xe?Ve&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,0,0,be[q].width,be[q].height,Ne,Se,be[q].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,ke,be[q].width,be[q].height,0,Ne,Se,be[q].data);for(let ae=0;ae<G.length;ae++){const ze=G[ae].image[q].image;Xe?Ve&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae+1,0,0,ze.width,ze.height,Ne,Se,ze.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae+1,ke,ze.width,ze.height,0,Ne,Se,ze.data)}}else{Xe?Ve&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,0,0,Ne,Se,be[q]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0,ke,Ne,Se,be[q]);for(let ae=0;ae<G.length;ae++){const fe=G[ae];Xe?Ve&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae+1,0,0,Ne,Se,fe.image[q]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+q,ae+1,ke,Ne,Se,fe.image[q])}}}m(C)&&d(n.TEXTURE_CUBE_MAP),ce.__version=le.version,C.onUpdate&&C.onUpdate(C)}N.__version=C.version}function k(N,C,Y,se,le,ce){const Ce=s.convert(Y.format,Y.colorSpace),ve=s.convert(Y.type),ge=v(Y.internalFormat,Ce,ve,Y.colorSpace);if(!i.get(C).__hasExternalTextures){const he=Math.max(1,C.width>>ce),be=Math.max(1,C.height>>ce);le===n.TEXTURE_3D||le===n.TEXTURE_2D_ARRAY?t.texImage3D(le,ce,ge,he,be,C.depth,0,Ce,ve,null):t.texImage2D(le,ce,ge,he,be,0,Ce,ve,null)}t.bindFramebuffer(n.FRAMEBUFFER,N),Pe(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,se,le,i.get(Y).__webglTexture,0,xe(C)):(le===n.TEXTURE_2D||le>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&le<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,se,le,i.get(Y).__webglTexture,ce),t.bindFramebuffer(n.FRAMEBUFFER,null)}function I(N,C,Y){if(n.bindRenderbuffer(n.RENDERBUFFER,N),C.depthBuffer&&!C.stencilBuffer){let se=n.DEPTH_COMPONENT24;if(Y||Pe(C)){const le=C.depthTexture;le&&le.isDepthTexture&&(le.type===er?se=n.DEPTH_COMPONENT32F:le.type===Zs&&(se=n.DEPTH_COMPONENT24));const ce=xe(C);Pe(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ce,se,C.width,C.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,ce,se,C.width,C.height)}else n.renderbufferStorage(n.RENDERBUFFER,se,C.width,C.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,N)}else if(C.depthBuffer&&C.stencilBuffer){const se=xe(C);Y&&Pe(C)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,se,n.DEPTH24_STENCIL8,C.width,C.height):Pe(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,se,n.DEPTH24_STENCIL8,C.width,C.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,N)}else{const se=C.textures;for(let le=0;le<se.length;le++){const ce=se[le],Ce=s.convert(ce.format,ce.colorSpace),ve=s.convert(ce.type),ge=v(ce.internalFormat,Ce,ve,ce.colorSpace),Ue=xe(C);Y&&Pe(C)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ue,ge,C.width,C.height):Pe(C)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ue,ge,C.width,C.height):n.renderbufferStorage(n.RENDERBUFFER,ge,C.width,C.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ne(N,C){if(C&&C.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,N),!(C.depthTexture&&C.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(C.depthTexture).__webglTexture||C.depthTexture.image.width!==C.width||C.depthTexture.image.height!==C.height)&&(C.depthTexture.image.width=C.width,C.depthTexture.image.height=C.height,C.depthTexture.needsUpdate=!0),L(C.depthTexture,0);const se=i.get(C.depthTexture).__webglTexture,le=xe(C);if(C.depthTexture.format===zs)Pe(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,se,0,le):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,se,0);else if(C.depthTexture.format===fa)Pe(C)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,se,0,le):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,se,0);else throw new Error("Unknown depthTexture format")}function ee(N){const C=i.get(N),Y=N.isWebGLCubeRenderTarget===!0;if(N.depthTexture&&!C.__autoAllocateDepthBuffer){if(Y)throw new Error("target.depthTexture not supported in Cube render targets");ne(C.__webglFramebuffer,N)}else if(Y){C.__webglDepthbuffer=[];for(let se=0;se<6;se++)t.bindFramebuffer(n.FRAMEBUFFER,C.__webglFramebuffer[se]),C.__webglDepthbuffer[se]=n.createRenderbuffer(),I(C.__webglDepthbuffer[se],N,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,C.__webglFramebuffer),C.__webglDepthbuffer=n.createRenderbuffer(),I(C.__webglDepthbuffer,N,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function pe(N,C,Y){const se=i.get(N);C!==void 0&&k(se.__webglFramebuffer,N,N.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),Y!==void 0&&ee(N)}function Ee(N){const C=N.texture,Y=i.get(N),se=i.get(C);N.addEventListener("dispose",T);const le=N.textures,ce=N.isWebGLCubeRenderTarget===!0,Ce=le.length>1;if(Ce||(se.__webglTexture===void 0&&(se.__webglTexture=n.createTexture()),se.__version=C.version,o.memory.textures++),ce){Y.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(C.mipmaps&&C.mipmaps.length>0){Y.__webglFramebuffer[ve]=[];for(let ge=0;ge<C.mipmaps.length;ge++)Y.__webglFramebuffer[ve][ge]=n.createFramebuffer()}else Y.__webglFramebuffer[ve]=n.createFramebuffer()}else{if(C.mipmaps&&C.mipmaps.length>0){Y.__webglFramebuffer=[];for(let ve=0;ve<C.mipmaps.length;ve++)Y.__webglFramebuffer[ve]=n.createFramebuffer()}else Y.__webglFramebuffer=n.createFramebuffer();if(Ce)for(let ve=0,ge=le.length;ve<ge;ve++){const Ue=i.get(le[ve]);Ue.__webglTexture===void 0&&(Ue.__webglTexture=n.createTexture(),o.memory.textures++)}if(N.samples>0&&Pe(N)===!1){Y.__webglMultisampledFramebuffer=n.createFramebuffer(),Y.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,Y.__webglMultisampledFramebuffer);for(let ve=0;ve<le.length;ve++){const ge=le[ve];Y.__webglColorRenderbuffer[ve]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,Y.__webglColorRenderbuffer[ve]);const Ue=s.convert(ge.format,ge.colorSpace),he=s.convert(ge.type),be=v(ge.internalFormat,Ue,he,ge.colorSpace,N.isXRRenderTarget===!0),Ze=xe(N);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ze,be,N.width,N.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ve,n.RENDERBUFFER,Y.__webglColorRenderbuffer[ve])}n.bindRenderbuffer(n.RENDERBUFFER,null),N.depthBuffer&&(Y.__webglDepthRenderbuffer=n.createRenderbuffer(),I(Y.__webglDepthRenderbuffer,N,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(ce){t.bindTexture(n.TEXTURE_CUBE_MAP,se.__webglTexture),W(n.TEXTURE_CUBE_MAP,C);for(let ve=0;ve<6;ve++)if(C.mipmaps&&C.mipmaps.length>0)for(let ge=0;ge<C.mipmaps.length;ge++)k(Y.__webglFramebuffer[ve][ge],N,C,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ve,ge);else k(Y.__webglFramebuffer[ve],N,C,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);m(C)&&d(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ce){for(let ve=0,ge=le.length;ve<ge;ve++){const Ue=le[ve],he=i.get(Ue);t.bindTexture(n.TEXTURE_2D,he.__webglTexture),W(n.TEXTURE_2D,Ue),k(Y.__webglFramebuffer,N,Ue,n.COLOR_ATTACHMENT0+ve,n.TEXTURE_2D,0),m(Ue)&&d(n.TEXTURE_2D)}t.unbindTexture()}else{let ve=n.TEXTURE_2D;if((N.isWebGL3DRenderTarget||N.isWebGLArrayRenderTarget)&&(ve=N.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ve,se.__webglTexture),W(ve,C),C.mipmaps&&C.mipmaps.length>0)for(let ge=0;ge<C.mipmaps.length;ge++)k(Y.__webglFramebuffer[ge],N,C,n.COLOR_ATTACHMENT0,ve,ge);else k(Y.__webglFramebuffer,N,C,n.COLOR_ATTACHMENT0,ve,0);m(C)&&d(ve),t.unbindTexture()}N.depthBuffer&&ee(N)}function U(N){const C=N.textures;for(let Y=0,se=C.length;Y<se;Y++){const le=C[Y];if(m(le)){const ce=N.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,Ce=i.get(le).__webglTexture;t.bindTexture(ce,Ce),d(ce),t.unbindTexture()}}}const Me=[],de=[];function We(N){if(N.samples>0){if(Pe(N)===!1){const C=N.textures,Y=N.width,se=N.height;let le=n.COLOR_BUFFER_BIT;const ce=N.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ce=i.get(N),ve=C.length>1;if(ve)for(let ge=0;ge<C.length;ge++)t.bindFramebuffer(n.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ge,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ge,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer);for(let ge=0;ge<C.length;ge++){if(N.resolveDepthBuffer&&(N.depthBuffer&&(le|=n.DEPTH_BUFFER_BIT),N.stencilBuffer&&N.resolveStencilBuffer&&(le|=n.STENCIL_BUFFER_BIT)),ve){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Ce.__webglColorRenderbuffer[ge]);const Ue=i.get(C[ge]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ue,0)}n.blitFramebuffer(0,0,Y,se,0,0,Y,se,le,n.NEAREST),l===!0&&(Me.length=0,de.length=0,Me.push(n.COLOR_ATTACHMENT0+ge),N.depthBuffer&&N.resolveDepthBuffer===!1&&(Me.push(ce),de.push(ce),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,de)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Me))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),ve)for(let ge=0;ge<C.length;ge++){t.bindFramebuffer(n.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ge,n.RENDERBUFFER,Ce.__webglColorRenderbuffer[ge]);const Ue=i.get(C[ge]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ge,n.TEXTURE_2D,Ue,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer)}else if(N.depthBuffer&&N.resolveDepthBuffer===!1&&l){const C=N.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[C])}}}function xe(N){return Math.min(r.maxSamples,N.samples)}function Pe(N){const C=i.get(N);return N.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&C.__useRenderToTexture!==!1}function Le(N){const C=o.render.frame;u.get(N)!==C&&(u.set(N,C),N.update())}function De(N,C){const Y=N.colorSpace,se=N.format,le=N.type;return N.isCompressedTexture===!0||N.isVideoTexture===!0||Y!==yr&&Y!==Ei&&(st.getTransfer(Y)===lt?(se!==Jn||le!==pr)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",Y)),C}function rt(N){return typeof HTMLImageElement<"u"&&N instanceof HTMLImageElement?(c.width=N.naturalWidth||N.width,c.height=N.naturalHeight||N.height):typeof VideoFrame<"u"&&N instanceof VideoFrame?(c.width=N.displayWidth,c.height=N.displayHeight):(c.width=N.width,c.height=N.height),c}this.allocateTextureUnit=D,this.resetTextureUnits=S,this.setTexture2D=L,this.setTexture2DArray=V,this.setTexture3D=j,this.setTextureCube=Q,this.rebindTextures=pe,this.setupRenderTarget=Ee,this.updateRenderTargetMipmap=U,this.updateMultisampleRenderTarget=We,this.setupDepthRenderbuffer=ee,this.setupFrameBufferTexture=k,this.useMultisampledRTT=Pe}function Ab(n,e){function t(i,r=Ei){let s;const o=st.getTransfer(r);if(i===pr)return n.UNSIGNED_BYTE;if(i===E_)return n.UNSIGNED_SHORT_4_4_4_4;if(i===w_)return n.UNSIGNED_SHORT_5_5_5_1;if(i===$S)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===WS)return n.BYTE;if(i===XS)return n.SHORT;if(i===M_)return n.UNSIGNED_SHORT;if(i===S_)return n.INT;if(i===Zs)return n.UNSIGNED_INT;if(i===er)return n.FLOAT;if(i===ur)return n.HALF_FLOAT;if(i===YS)return n.ALPHA;if(i===qS)return n.RGB;if(i===Jn)return n.RGBA;if(i===KS)return n.LUMINANCE;if(i===ZS)return n.LUMINANCE_ALPHA;if(i===zs)return n.DEPTH_COMPONENT;if(i===fa)return n.DEPTH_STENCIL;if(i===JS)return n.RED;if(i===T_)return n.RED_INTEGER;if(i===QS)return n.RG;if(i===A_)return n.RG_INTEGER;if(i===b_)return n.RGBA_INTEGER;if(i===cu||i===uu||i===du||i===fu)if(o===lt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===cu)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===uu)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===du)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===fu)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===cu)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===uu)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===du)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===fu)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Vp||i===jp||i===Gp||i===Wp)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Vp)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===jp)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Gp)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Wp)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Xp||i===$p||i===Yp)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Xp||i===$p)return o===lt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Yp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===qp||i===Kp||i===Zp||i===Jp||i===Qp||i===em||i===tm||i===nm||i===im||i===rm||i===sm||i===om||i===am||i===lm)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===qp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Kp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Zp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Jp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Qp)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===em)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===tm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===nm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===im)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===rm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===sm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===om)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===am)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===lm)return o===lt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===hu||i===cm||i===um)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===hu)return o===lt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===cm)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===um)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===eE||i===dm||i===fm||i===hm)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===hu)return s.COMPRESSED_RED_RGTC1_EXT;if(i===dm)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===fm)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===hm)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===ya?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}class bb extends xn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class Ns extends Ot{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Cb={type:"move"};class ku{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ns,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ns,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ns,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const y of e.hand.values()){const m=t.getJointPose(y,i),d=this._getHandJoint(c,y);m!==null&&(d.matrix.fromArray(m.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=m.radius),d.visible=m!==null}const u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],p=u.position.distanceTo(h.position),f=.02,g=.005;c.inputState.pinching&&p>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&p<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Cb)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Ns;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const Rb=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Pb=`
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

}`;class Nb{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,i){if(this.texture===null){const r=new Qt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}render(e,t){if(this.texture!==null){if(this.mesh===null){const i=t.cameras[0].viewport,r=new Vt({vertexShader:Rb,fragmentShader:Pb,uniforms:{depthColor:{value:this.texture},depthWidth:{value:i.z},depthHeight:{value:i.w}}});this.mesh=new At(new mr(20,20),r)}e.render(this.mesh,t)}}reset(){this.texture=null,this.mesh=null}}class Lb extends $r{constructor(e,t){super();const i=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,h=null,p=null,f=null,g=null;const y=new Nb,m=t.getContextAttributes();let d=null,v=null;const _=[],M=[],T=new we;let b=null;const E=new xn;E.layers.enable(1),E.viewport=new Ut;const P=new xn;P.layers.enable(2),P.viewport=new Ut;const A=[E,P],S=new bb;S.layers.enable(1),S.layers.enable(2);let D=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let I=_[k];return I===void 0&&(I=new ku,_[k]=I),I.getTargetRaySpace()},this.getControllerGrip=function(k){let I=_[k];return I===void 0&&(I=new ku,_[k]=I),I.getGripSpace()},this.getHand=function(k){let I=_[k];return I===void 0&&(I=new ku,_[k]=I),I.getHandSpace()};function L(k){const I=M.indexOf(k.inputSource);if(I===-1)return;const ne=_[I];ne!==void 0&&(ne.update(k.inputSource,k.frame,c||o),ne.dispatchEvent({type:k.type,data:k.inputSource}))}function V(){r.removeEventListener("select",L),r.removeEventListener("selectstart",L),r.removeEventListener("selectend",L),r.removeEventListener("squeeze",L),r.removeEventListener("squeezestart",L),r.removeEventListener("squeezeend",L),r.removeEventListener("end",V),r.removeEventListener("inputsourceschange",j);for(let k=0;k<_.length;k++){const I=M[k];I!==null&&(M[k]=null,_[k].disconnect(I))}D=null,B=null,y.reset(),e.setRenderTarget(d),f=null,p=null,h=null,r=null,v=null,K.stop(),i.isPresenting=!1,e.setPixelRatio(b),e.setSize(T.width,T.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){s=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){a=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(k){c=k},this.getBaseLayer=function(){return p!==null?p:f},this.getBinding=function(){return h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(k){if(r=k,r!==null){if(d=e.getRenderTarget(),r.addEventListener("select",L),r.addEventListener("selectstart",L),r.addEventListener("selectend",L),r.addEventListener("squeeze",L),r.addEventListener("squeezestart",L),r.addEventListener("squeezeend",L),r.addEventListener("end",V),r.addEventListener("inputsourceschange",j),m.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(T),r.renderState.layers===void 0){const I={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,I),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new ti(f.framebufferWidth,f.framebufferHeight,{format:Jn,type:pr,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let I=null,ne=null,ee=null;m.depth&&(ee=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,I=m.stencil?fa:zs,ne=m.stencil?ya:Zs);const pe={colorFormat:t.RGBA8,depthFormat:ee,scaleFactor:s};h=new XRWebGLBinding(r,t),p=h.createProjectionLayer(pe),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),v=new ti(p.textureWidth,p.textureHeight,{format:Jn,type:pr,depthTexture:new z_(p.textureWidth,p.textureHeight,ne,void 0,void 0,void 0,void 0,void 0,void 0,I),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),K.setContext(r),K.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function j(k){for(let I=0;I<k.removed.length;I++){const ne=k.removed[I],ee=M.indexOf(ne);ee>=0&&(M[ee]=null,_[ee].disconnect(ne))}for(let I=0;I<k.added.length;I++){const ne=k.added[I];let ee=M.indexOf(ne);if(ee===-1){for(let Ee=0;Ee<_.length;Ee++)if(Ee>=M.length){M.push(ne),ee=Ee;break}else if(M[Ee]===null){M[Ee]=ne,ee=Ee;break}if(ee===-1)break}const pe=_[ee];pe&&pe.connect(ne)}}const Q=new O,$=new O;function F(k,I,ne){Q.setFromMatrixPosition(I.matrixWorld),$.setFromMatrixPosition(ne.matrixWorld);const ee=Q.distanceTo($),pe=I.projectionMatrix.elements,Ee=ne.projectionMatrix.elements,U=pe[14]/(pe[10]-1),Me=pe[14]/(pe[10]+1),de=(pe[9]+1)/pe[5],We=(pe[9]-1)/pe[5],xe=(pe[8]-1)/pe[0],Pe=(Ee[8]+1)/Ee[0],Le=U*xe,De=U*Pe,rt=ee/(-xe+Pe),N=rt*-xe;I.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(N),k.translateZ(rt),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert();const C=U+rt,Y=Me+rt,se=Le-N,le=De+(ee-N),ce=de*Me/Y*C,Ce=We*Me/Y*C;k.projectionMatrix.makePerspective(se,le,ce,Ce,C,Y),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}function H(k,I){I===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(I.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(r===null)return;y.texture!==null&&(k.near=y.depthNear,k.far=y.depthFar),S.near=P.near=E.near=k.near,S.far=P.far=E.far=k.far,(D!==S.near||B!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),D=S.near,B=S.far,E.near=D,E.far=B,P.near=D,P.far=B,E.updateProjectionMatrix(),P.updateProjectionMatrix(),k.updateProjectionMatrix());const I=k.parent,ne=S.cameras;H(S,I);for(let ee=0;ee<ne.length;ee++)H(ne[ee],I);ne.length===2?F(S,E,P):S.projectionMatrix.copy(E.projectionMatrix),W(k,S,I)};function W(k,I,ne){ne===null?k.matrix.copy(I.matrixWorld):(k.matrix.copy(ne.matrixWorld),k.matrix.invert(),k.matrix.multiply(I.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(I.projectionMatrix),k.projectionMatrixInverse.copy(I.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=ha*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(p===null&&f===null))return l},this.setFoveation=function(k){l=k,p!==null&&(p.fixedFoveation=k),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=k)},this.hasDepthSensing=function(){return y.texture!==null};let z=null;function re(k,I){if(u=I.getViewerPose(c||o),g=I,u!==null){const ne=u.views;f!==null&&(e.setRenderTargetFramebuffer(v,f.framebuffer),e.setRenderTarget(v));let ee=!1;ne.length!==S.cameras.length&&(S.cameras.length=0,ee=!0);for(let Ee=0;Ee<ne.length;Ee++){const U=ne[Ee];let Me=null;if(f!==null)Me=f.getViewport(U);else{const We=h.getViewSubImage(p,U);Me=We.viewport,Ee===0&&(e.setRenderTargetTextures(v,We.colorTexture,p.ignoreDepthValues?void 0:We.depthStencilTexture),e.setRenderTarget(v))}let de=A[Ee];de===void 0&&(de=new xn,de.layers.enable(Ee),de.viewport=new Ut,A[Ee]=de),de.matrix.fromArray(U.transform.matrix),de.matrix.decompose(de.position,de.quaternion,de.scale),de.projectionMatrix.fromArray(U.projectionMatrix),de.projectionMatrixInverse.copy(de.projectionMatrix).invert(),de.viewport.set(Me.x,Me.y,Me.width,Me.height),Ee===0&&(S.matrix.copy(de.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),ee===!0&&S.cameras.push(de)}const pe=r.enabledFeatures;if(pe&&pe.includes("depth-sensing")){const Ee=h.getDepthInformation(ne[0]);Ee&&Ee.isValid&&Ee.texture&&y.init(e,Ee,r.renderState)}}for(let ne=0;ne<_.length;ne++){const ee=M[ne],pe=_[ne];ee!==null&&pe!==void 0&&pe.update(ee,I,c||o)}y.render(e,S),z&&z(k,I),I.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:I}),g=null}const K=new k_;K.setAnimationLoop(re),this.setAnimationLoop=function(k){z=k},this.dispose=function(){}}}const br=new di,Ib=new Qe;function Db(n,e){function t(m,d){m.matrixAutoUpdate===!0&&m.updateMatrix(),d.value.copy(m.matrix)}function i(m,d){d.color.getRGB(m.fogColor.value,U_(n)),d.isFog?(m.fogNear.value=d.near,m.fogFar.value=d.far):d.isFogExp2&&(m.fogDensity.value=d.density)}function r(m,d,v,_,M){d.isMeshBasicMaterial||d.isMeshLambertMaterial?s(m,d):d.isMeshToonMaterial?(s(m,d),h(m,d)):d.isMeshPhongMaterial?(s(m,d),u(m,d)):d.isMeshStandardMaterial?(s(m,d),p(m,d),d.isMeshPhysicalMaterial&&f(m,d,M)):d.isMeshMatcapMaterial?(s(m,d),g(m,d)):d.isMeshDepthMaterial?s(m,d):d.isMeshDistanceMaterial?(s(m,d),y(m,d)):d.isMeshNormalMaterial?s(m,d):d.isLineBasicMaterial?(o(m,d),d.isLineDashedMaterial&&a(m,d)):d.isPointsMaterial?l(m,d,v,_):d.isSpriteMaterial?c(m,d):d.isShadowMaterial?(m.color.value.copy(d.color),m.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function s(m,d){m.opacity.value=d.opacity,d.color&&m.diffuse.value.copy(d.color),d.emissive&&m.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.bumpMap&&(m.bumpMap.value=d.bumpMap,t(d.bumpMap,m.bumpMapTransform),m.bumpScale.value=d.bumpScale,d.side===hn&&(m.bumpScale.value*=-1)),d.normalMap&&(m.normalMap.value=d.normalMap,t(d.normalMap,m.normalMapTransform),m.normalScale.value.copy(d.normalScale),d.side===hn&&m.normalScale.value.negate()),d.displacementMap&&(m.displacementMap.value=d.displacementMap,t(d.displacementMap,m.displacementMapTransform),m.displacementScale.value=d.displacementScale,m.displacementBias.value=d.displacementBias),d.emissiveMap&&(m.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,m.emissiveMapTransform)),d.specularMap&&(m.specularMap.value=d.specularMap,t(d.specularMap,m.specularMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest);const v=e.get(d),_=v.envMap,M=v.envMapRotation;if(_&&(m.envMap.value=_,br.copy(M),br.x*=-1,br.y*=-1,br.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(br.y*=-1,br.z*=-1),m.envMapRotation.value.setFromMatrix4(Ib.makeRotationFromEuler(br)),m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=d.reflectivity,m.ior.value=d.ior,m.refractionRatio.value=d.refractionRatio),d.lightMap){m.lightMap.value=d.lightMap;const T=n._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=d.lightMapIntensity*T,t(d.lightMap,m.lightMapTransform)}d.aoMap&&(m.aoMap.value=d.aoMap,m.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,m.aoMapTransform))}function o(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform))}function a(m,d){m.dashSize.value=d.dashSize,m.totalSize.value=d.dashSize+d.gapSize,m.scale.value=d.scale}function l(m,d,v,_){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.size.value=d.size*v,m.scale.value=_*.5,d.map&&(m.map.value=d.map,t(d.map,m.uvTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function c(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.rotation.value=d.rotation,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function u(m,d){m.specular.value.copy(d.specular),m.shininess.value=Math.max(d.shininess,1e-4)}function h(m,d){d.gradientMap&&(m.gradientMap.value=d.gradientMap)}function p(m,d){m.metalness.value=d.metalness,d.metalnessMap&&(m.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,m.metalnessMapTransform)),m.roughness.value=d.roughness,d.roughnessMap&&(m.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,m.roughnessMapTransform)),d.envMap&&(m.envMapIntensity.value=d.envMapIntensity)}function f(m,d,v){m.ior.value=d.ior,d.sheen>0&&(m.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),m.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(m.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,m.sheenColorMapTransform)),d.sheenRoughnessMap&&(m.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,m.sheenRoughnessMapTransform))),d.clearcoat>0&&(m.clearcoat.value=d.clearcoat,m.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(m.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,m.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(m.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===hn&&m.clearcoatNormalScale.value.negate())),d.dispersion>0&&(m.dispersion.value=d.dispersion),d.iridescence>0&&(m.iridescence.value=d.iridescence,m.iridescenceIOR.value=d.iridescenceIOR,m.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(m.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,m.iridescenceMapTransform)),d.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),d.transmission>0&&(m.transmission.value=d.transmission,m.transmissionSamplerMap.value=v.texture,m.transmissionSamplerSize.value.set(v.width,v.height),d.transmissionMap&&(m.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,m.transmissionMapTransform)),m.thickness.value=d.thickness,d.thicknessMap&&(m.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=d.attenuationDistance,m.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(m.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(m.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=d.specularIntensity,m.specularColor.value.copy(d.specularColor),d.specularColorMap&&(m.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,m.specularColorMapTransform)),d.specularIntensityMap&&(m.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,d){d.matcap&&(m.matcap.value=d.matcap)}function y(m,d){const v=e.get(d).light;m.referencePosition.value.setFromMatrixPosition(v.matrixWorld),m.nearDistance.value=v.shadow.camera.near,m.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Ub(n,e,t,i){let r={},s={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,_){const M=_.program;i.uniformBlockBinding(v,M)}function c(v,_){let M=r[v.id];M===void 0&&(g(v),M=u(v),r[v.id]=M,v.addEventListener("dispose",m));const T=_.program;i.updateUBOMapping(v,T);const b=e.render.frame;s[v.id]!==b&&(p(v),s[v.id]=b)}function u(v){const _=h();v.__bindingPointIndex=_;const M=n.createBuffer(),T=v.__size,b=v.usage;return n.bindBuffer(n.UNIFORM_BUFFER,M),n.bufferData(n.UNIFORM_BUFFER,T,b),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,_,M),M}function h(){for(let v=0;v<a;v++)if(o.indexOf(v)===-1)return o.push(v),v;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(v){const _=r[v.id],M=v.uniforms,T=v.__cache;n.bindBuffer(n.UNIFORM_BUFFER,_);for(let b=0,E=M.length;b<E;b++){const P=Array.isArray(M[b])?M[b]:[M[b]];for(let A=0,S=P.length;A<S;A++){const D=P[A];if(f(D,b,A,T)===!0){const B=D.__offset,L=Array.isArray(D.value)?D.value:[D.value];let V=0;for(let j=0;j<L.length;j++){const Q=L[j],$=y(Q);typeof Q=="number"||typeof Q=="boolean"?(D.__data[0]=Q,n.bufferSubData(n.UNIFORM_BUFFER,B+V,D.__data)):Q.isMatrix3?(D.__data[0]=Q.elements[0],D.__data[1]=Q.elements[1],D.__data[2]=Q.elements[2],D.__data[3]=0,D.__data[4]=Q.elements[3],D.__data[5]=Q.elements[4],D.__data[6]=Q.elements[5],D.__data[7]=0,D.__data[8]=Q.elements[6],D.__data[9]=Q.elements[7],D.__data[10]=Q.elements[8],D.__data[11]=0):(Q.toArray(D.__data,V),V+=$.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,B,D.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(v,_,M,T){const b=v.value,E=_+"_"+M;if(T[E]===void 0)return typeof b=="number"||typeof b=="boolean"?T[E]=b:T[E]=b.clone(),!0;{const P=T[E];if(typeof b=="number"||typeof b=="boolean"){if(P!==b)return T[E]=b,!0}else if(P.equals(b)===!1)return P.copy(b),!0}return!1}function g(v){const _=v.uniforms;let M=0;const T=16;for(let E=0,P=_.length;E<P;E++){const A=Array.isArray(_[E])?_[E]:[_[E]];for(let S=0,D=A.length;S<D;S++){const B=A[S],L=Array.isArray(B.value)?B.value:[B.value];for(let V=0,j=L.length;V<j;V++){const Q=L[V],$=y(Q),F=M%T;F!==0&&T-F<$.boundary&&(M+=T-F),B.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),B.__offset=M,M+=$.storage}}}const b=M%T;return b>0&&(M+=T-b),v.__size=M,v.__cache={},this}function y(v){const _={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(_.boundary=4,_.storage=4):v.isVector2?(_.boundary=8,_.storage=8):v.isVector3||v.isColor?(_.boundary=16,_.storage=12):v.isVector4?(_.boundary=16,_.storage=16):v.isMatrix3?(_.boundary=48,_.storage=48):v.isMatrix4?(_.boundary=64,_.storage=64):v.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",v),_}function m(v){const _=v.target;_.removeEventListener("dispose",m);const M=o.indexOf(_.__bindingPointIndex);o.splice(M,1),n.deleteBuffer(r[_.id]),delete r[_.id],delete s[_.id]}function d(){for(const v in r)n.deleteBuffer(r[v]);o=[],r={},s={}}return{bind:l,update:c,dispose:d}}class W_{constructor(e={}){const{canvas:t=RE(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1}=e;this.isWebGLRenderer=!0;let p;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=i.getContextAttributes().alpha}else p=o;const f=new Uint32Array(4),g=new Int32Array(4);let y=null,m=null;const d=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=_n,this._useLegacyLights=!1,this.toneMapping=cr,this.toneMappingExposure=1;const _=this;let M=!1,T=0,b=0,E=null,P=-1,A=null;const S=new Ut,D=new Ut;let B=null;const L=new He(0);let V=0,j=t.width,Q=t.height,$=1,F=null,H=null;const W=new Ut(0,0,j,Q),z=new Ut(0,0,j,Q);let re=!1;const K=new ah;let k=!1,I=!1;const ne=new Qe,ee=new O,pe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ee(){return E===null?$:1}let U=i;function Me(R,X){return t.getContext(R,X)}try{const R={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${bc}`),t.addEventListener("webglcontextlost",w,!1),t.addEventListener("webglcontextrestored",G,!1),t.addEventListener("webglcontextcreationerror",q,!1),U===null){const X="webgl2";if(U=Me(X,R),U===null)throw Me(X)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let de,We,xe,Pe,Le,De,rt,N,C,Y,se,le,ce,Ce,ve,ge,Ue,he,be,Ze,Ne,Se,ke,Xe;function at(){de=new G1(U),de.init(),Se=new Ab(U,de),We=new k1(U,de,e,Se),xe=new wb(U),Pe=new $1(U),Le=new ub,De=new Tb(U,de,xe,Le,We,Se,Pe),rt=new B1(_),N=new j1(_),C=new ew(U),ke=new F1(U,C),Y=new W1(U,C,Pe,ke),se=new q1(U,Y,C,Pe),be=new Y1(U,We,De),ge=new z1(Le),le=new cb(_,rt,N,de,We,ke,ge),ce=new Db(_,Le),Ce=new fb,ve=new _b(de),he=new U1(_,rt,N,xe,se,p,l),Ue=new Eb(_,se,We),Xe=new Ub(U,Pe,We,xe),Ze=new O1(U,de,Pe),Ne=new X1(U,de,Pe),Pe.programs=le.programs,_.capabilities=We,_.extensions=de,_.properties=Le,_.renderLists=Ce,_.shadowMap=Ue,_.state=xe,_.info=Pe}at();const Ve=new Lb(_,U);this.xr=Ve,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const R=de.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=de.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(R){R!==void 0&&($=R,this.setSize(j,Q,!1))},this.getSize=function(R){return R.set(j,Q)},this.setSize=function(R,X,ie=!0){if(Ve.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}j=R,Q=X,t.width=Math.floor(R*$),t.height=Math.floor(X*$),ie===!0&&(t.style.width=R+"px",t.style.height=X+"px"),this.setViewport(0,0,R,X)},this.getDrawingBufferSize=function(R){return R.set(j*$,Q*$).floor()},this.setDrawingBufferSize=function(R,X,ie){j=R,Q=X,$=ie,t.width=Math.floor(R*ie),t.height=Math.floor(X*ie),this.setViewport(0,0,R,X)},this.getCurrentViewport=function(R){return R.copy(S)},this.getViewport=function(R){return R.copy(W)},this.setViewport=function(R,X,ie,Z){R.isVector4?W.set(R.x,R.y,R.z,R.w):W.set(R,X,ie,Z),xe.viewport(S.copy(W).multiplyScalar($).round())},this.getScissor=function(R){return R.copy(z)},this.setScissor=function(R,X,ie,Z){R.isVector4?z.set(R.x,R.y,R.z,R.w):z.set(R,X,ie,Z),xe.scissor(D.copy(z).multiplyScalar($).round())},this.getScissorTest=function(){return re},this.setScissorTest=function(R){xe.setScissorTest(re=R)},this.setOpaqueSort=function(R){F=R},this.setTransparentSort=function(R){H=R},this.getClearColor=function(R){return R.copy(he.getClearColor())},this.setClearColor=function(){he.setClearColor.apply(he,arguments)},this.getClearAlpha=function(){return he.getClearAlpha()},this.setClearAlpha=function(){he.setClearAlpha.apply(he,arguments)},this.clear=function(R=!0,X=!0,ie=!0){let Z=0;if(R){let J=!1;if(E!==null){const _e=E.texture.format;J=_e===b_||_e===A_||_e===T_}if(J){const _e=E.texture.type,Te=_e===pr||_e===Zs||_e===M_||_e===ya||_e===E_||_e===w_,Ae=he.getClearColor(),Ie=he.getClearAlpha(),Fe=Ae.r,je=Ae.g,Ye=Ae.b;Te?(f[0]=Fe,f[1]=je,f[2]=Ye,f[3]=Ie,U.clearBufferuiv(U.COLOR,0,f)):(g[0]=Fe,g[1]=je,g[2]=Ye,g[3]=Ie,U.clearBufferiv(U.COLOR,0,g))}else Z|=U.COLOR_BUFFER_BIT}X&&(Z|=U.DEPTH_BUFFER_BIT),ie&&(Z|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),U.clear(Z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",w,!1),t.removeEventListener("webglcontextrestored",G,!1),t.removeEventListener("webglcontextcreationerror",q,!1),Ce.dispose(),ve.dispose(),Le.dispose(),rt.dispose(),N.dispose(),se.dispose(),ke.dispose(),Xe.dispose(),le.dispose(),Ve.dispose(),Ve.removeEventListener("sessionstart",et),Ve.removeEventListener("sessionend",Et),dt.stop()};function w(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),M=!0}function G(){console.log("THREE.WebGLRenderer: Context Restored."),M=!1;const R=Pe.autoReset,X=Ue.enabled,ie=Ue.autoUpdate,Z=Ue.needsUpdate,J=Ue.type;at(),Pe.autoReset=R,Ue.enabled=X,Ue.autoUpdate=ie,Ue.needsUpdate=Z,Ue.type=J}function q(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function ae(R){const X=R.target;X.removeEventListener("dispose",ae),fe(X)}function fe(R){ze(R),Le.remove(R)}function ze(R){const X=Le.get(R).programs;X!==void 0&&(X.forEach(function(ie){le.releaseProgram(ie)}),R.isShaderMaterial&&le.releaseShaderCache(R))}this.renderBufferDirect=function(R,X,ie,Z,J,_e){X===null&&(X=pe);const Te=J.isMesh&&J.matrixWorld.determinant()<0,Ae=ex(R,X,ie,Z,J);xe.setMaterial(Z,Te);let Ie=ie.index,Fe=1;if(Z.wireframe===!0){if(Ie=Y.getWireframeAttribute(ie),Ie===void 0)return;Fe=2}const je=ie.drawRange,Ye=ie.attributes.position;let wt=je.start*Fe,Wt=(je.start+je.count)*Fe;_e!==null&&(wt=Math.max(wt,_e.start*Fe),Wt=Math.min(Wt,(_e.start+_e.count)*Fe)),Ie!==null?(wt=Math.max(wt,0),Wt=Math.min(Wt,Ie.count)):Ye!=null&&(wt=Math.max(wt,0),Wt=Math.min(Wt,Ye.count));const pn=Wt-wt;if(pn<0||pn===1/0)return;ke.setup(J,Z,Ae,ie,Ie);let hi,it=Ze;if(Ie!==null&&(hi=C.get(Ie),it=Ne,it.setIndex(hi)),J.isMesh)Z.wireframe===!0?(xe.setLineWidth(Z.wireframeLinewidth*Ee()),it.setMode(U.LINES)):it.setMode(U.TRIANGLES);else if(J.isLine){let Oe=Z.linewidth;Oe===void 0&&(Oe=1),xe.setLineWidth(Oe*Ee()),J.isLineSegments?it.setMode(U.LINES):J.isLineLoop?it.setMode(U.LINE_LOOP):it.setMode(U.LINE_STRIP)}else J.isPoints?it.setMode(U.POINTS):J.isSprite&&it.setMode(U.TRIANGLES);if(J.isBatchedMesh)J._multiDrawInstances!==null?it.renderMultiDrawInstances(J._multiDrawStarts,J._multiDrawCounts,J._multiDrawCount,J._multiDrawInstances):it.renderMultiDraw(J._multiDrawStarts,J._multiDrawCounts,J._multiDrawCount);else if(J.isInstancedMesh)it.renderInstances(wt,pn,J.count);else if(ie.isInstancedBufferGeometry){const Oe=ie._maxInstanceCount!==void 0?ie._maxInstanceCount:1/0,co=Math.min(ie.instanceCount,Oe);it.renderInstances(wt,pn,co)}else it.render(wt,pn)};function $e(R,X,ie){R.transparent===!0&&R.side===Un&&R.forceSinglePass===!1?(R.side=hn,R.needsUpdate=!0,Sa(R,X,ie),R.side=hr,R.needsUpdate=!0,Sa(R,X,ie),R.side=Un):Sa(R,X,ie)}this.compile=function(R,X,ie=null){ie===null&&(ie=R),m=ve.get(ie),m.init(X),v.push(m),ie.traverseVisible(function(J){J.isLight&&J.layers.test(X.layers)&&(m.pushLight(J),J.castShadow&&m.pushShadow(J))}),R!==ie&&R.traverseVisible(function(J){J.isLight&&J.layers.test(X.layers)&&(m.pushLight(J),J.castShadow&&m.pushShadow(J))}),m.setupLights(_._useLegacyLights);const Z=new Set;return R.traverse(function(J){const _e=J.material;if(_e)if(Array.isArray(_e))for(let Te=0;Te<_e.length;Te++){const Ae=_e[Te];$e(Ae,ie,J),Z.add(Ae)}else $e(_e,ie,J),Z.add(_e)}),v.pop(),m=null,Z},this.compileAsync=function(R,X,ie=null){const Z=this.compile(R,X,ie);return new Promise(J=>{function _e(){if(Z.forEach(function(Te){Le.get(Te).currentProgram.isReady()&&Z.delete(Te)}),Z.size===0){J(R);return}setTimeout(_e,10)}de.get("KHR_parallel_shader_compile")!==null?_e():setTimeout(_e,10)})};let gt=null;function Lt(R){gt&&gt(R)}function et(){dt.stop()}function Et(){dt.start()}const dt=new k_;dt.setAnimationLoop(Lt),typeof self<"u"&&dt.setContext(self),this.setAnimationLoop=function(R){gt=R,Ve.setAnimationLoop(R),R===null?dt.stop():dt.start()},Ve.addEventListener("sessionstart",et),Ve.addEventListener("sessionend",Et),this.render=function(R,X){if(X!==void 0&&X.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(M===!0)return;R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),X.parent===null&&X.matrixWorldAutoUpdate===!0&&X.updateMatrixWorld(),Ve.enabled===!0&&Ve.isPresenting===!0&&(Ve.cameraAutoUpdate===!0&&Ve.updateCamera(X),X=Ve.getCamera()),R.isScene===!0&&R.onBeforeRender(_,R,X,E),m=ve.get(R,v.length),m.init(X),v.push(m),ne.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),K.setFromProjectionMatrix(ne),I=this.localClippingEnabled,k=ge.init(this.clippingPlanes,I),y=Ce.get(R,d.length),y.init(),d.push(y),Di(R,X,0,_.sortObjects),y.finish(),_.sortObjects===!0&&y.sort(F,H);const ie=Ve.enabled===!1||Ve.isPresenting===!1||Ve.hasDepthSensing()===!1;ie&&he.addToRenderList(y,R),this.info.render.frame++,k===!0&&ge.beginShadows();const Z=m.state.shadowsArray;Ue.render(Z,R,X),k===!0&&ge.endShadows(),this.info.autoReset===!0&&this.info.reset();const J=y.opaque,_e=y.transmissive;if(m.setupLights(_._useLegacyLights),X.isArrayCamera){const Te=X.cameras;if(_e.length>0)for(let Ae=0,Ie=Te.length;Ae<Ie;Ae++){const Fe=Te[Ae];Ui(J,_e,R,Fe)}ie&&he.render(R);for(let Ae=0,Ie=Te.length;Ae<Ie;Ae++){const Fe=Te[Ae];Cn(y,R,Fe,Fe.viewport)}}else _e.length>0&&Ui(J,_e,R,X),ie&&he.render(R),Cn(y,R,X);E!==null&&(De.updateMultisampleRenderTarget(E),De.updateRenderTargetMipmap(E)),R.isScene===!0&&R.onAfterRender(_,R,X),ke.resetDefaultState(),P=-1,A=null,v.pop(),v.length>0?(m=v[v.length-1],k===!0&&ge.setGlobalState(_.clippingPlanes,m.state.camera)):m=null,d.pop(),d.length>0?y=d[d.length-1]:y=null};function Di(R,X,ie,Z){if(R.visible===!1)return;if(R.layers.test(X.layers)){if(R.isGroup)ie=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(X);else if(R.isLight)m.pushLight(R),R.castShadow&&m.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||K.intersectsSprite(R)){Z&&ee.setFromMatrixPosition(R.matrixWorld).applyMatrix4(ne);const Te=se.update(R),Ae=R.material;Ae.visible&&y.push(R,Te,Ae,ie,ee.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||K.intersectsObject(R))){const Te=se.update(R),Ae=R.material;if(Z&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),ee.copy(R.boundingSphere.center)):(Te.boundingSphere===null&&Te.computeBoundingSphere(),ee.copy(Te.boundingSphere.center)),ee.applyMatrix4(R.matrixWorld).applyMatrix4(ne)),Array.isArray(Ae)){const Ie=Te.groups;for(let Fe=0,je=Ie.length;Fe<je;Fe++){const Ye=Ie[Fe],wt=Ae[Ye.materialIndex];wt&&wt.visible&&y.push(R,Te,wt,ie,ee.z,Ye)}}else Ae.visible&&y.push(R,Te,Ae,ie,ee.z,null)}}const _e=R.children;for(let Te=0,Ae=_e.length;Te<Ae;Te++)Di(_e[Te],X,ie,Z)}function Cn(R,X,ie,Z){const J=R.opaque,_e=R.transmissive,Te=R.transparent;m.setupLightsView(ie),k===!0&&ge.setGlobalState(_.clippingPlanes,ie),Z&&xe.viewport(S.copy(Z)),J.length>0&&fi(J,X,ie),_e.length>0&&fi(_e,X,ie),Te.length>0&&fi(Te,X,ie),xe.buffers.depth.setTest(!0),xe.buffers.depth.setMask(!0),xe.buffers.color.setMask(!0),xe.setPolygonOffset(!1)}function Ui(R,X,ie,Z){if((ie.isScene===!0?ie.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[Z.id]===void 0&&(m.state.transmissionRenderTarget[Z.id]=new ti(1,1,{generateMipmaps:!0,type:de.has("EXT_color_buffer_half_float")||de.has("EXT_color_buffer_float")?ur:pr,minFilter:Qi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1}));const _e=m.state.transmissionRenderTarget[Z.id],Te=Z.viewport||S;_e.setSize(Te.z,Te.w);const Ae=_.getRenderTarget();_.setRenderTarget(_e),_.getClearColor(L),V=_.getClearAlpha(),V<1&&_.setClearColor(16777215,.5),_.clear();const Ie=_.toneMapping;_.toneMapping=cr;const Fe=Z.viewport;if(Z.viewport!==void 0&&(Z.viewport=void 0),m.setupLightsView(Z),k===!0&&ge.setGlobalState(_.clippingPlanes,Z),fi(R,ie,Z),De.updateMultisampleRenderTarget(_e),De.updateRenderTargetMipmap(_e),de.has("WEBGL_multisampled_render_to_texture")===!1){let je=!1;for(let Ye=0,wt=X.length;Ye<wt;Ye++){const Wt=X[Ye],pn=Wt.object,hi=Wt.geometry,it=Wt.material,Oe=Wt.group;if(it.side===Un&&pn.layers.test(Z.layers)){const co=it.side;it.side=hn,it.needsUpdate=!0,lo(pn,ie,Z,hi,it,Oe),it.side=co,it.needsUpdate=!0,je=!0}}je===!0&&(De.updateMultisampleRenderTarget(_e),De.updateRenderTargetMipmap(_e))}_.setRenderTarget(Ae),_.setClearColor(L,V),Fe!==void 0&&(Z.viewport=Fe),_.toneMapping=Ie}function fi(R,X,ie){const Z=X.isScene===!0?X.overrideMaterial:null;for(let J=0,_e=R.length;J<_e;J++){const Te=R[J],Ae=Te.object,Ie=Te.geometry,Fe=Z===null?Te.material:Z,je=Te.group;Ae.layers.test(ie.layers)&&lo(Ae,X,ie,Ie,Fe,je)}}function lo(R,X,ie,Z,J,_e){R.onBeforeRender(_,X,ie,Z,J,_e),R.modelViewMatrix.multiplyMatrices(ie.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),J.onBeforeRender(_,X,ie,Z,R,_e),J.transparent===!0&&J.side===Un&&J.forceSinglePass===!1?(J.side=hn,J.needsUpdate=!0,_.renderBufferDirect(ie,X,Z,J,R,_e),J.side=hr,J.needsUpdate=!0,_.renderBufferDirect(ie,X,Z,J,R,_e),J.side=Un):_.renderBufferDirect(ie,X,Z,J,R,_e),R.onAfterRender(_,X,ie,Z,J,_e)}function Sa(R,X,ie){X.isScene!==!0&&(X=pe);const Z=Le.get(R),J=m.state.lights,_e=m.state.shadowsArray,Te=J.state.version,Ae=le.getParameters(R,J.state,_e,X,ie),Ie=le.getProgramCacheKey(Ae);let Fe=Z.programs;Z.environment=R.isMeshStandardMaterial?X.environment:null,Z.fog=X.fog,Z.envMap=(R.isMeshStandardMaterial?N:rt).get(R.envMap||Z.environment),Z.envMapRotation=Z.environment!==null&&R.envMap===null?X.environmentRotation:R.envMapRotation,Fe===void 0&&(R.addEventListener("dispose",ae),Fe=new Map,Z.programs=Fe);let je=Fe.get(Ie);if(je!==void 0){if(Z.currentProgram===je&&Z.lightsStateVersion===Te)return _h(R,Ae),je}else Ae.uniforms=le.getUniforms(R),R.onBuild(ie,Ae,_),R.onBeforeCompile(Ae,_),je=le.acquireProgram(Ae,Ie),Fe.set(Ie,je),Z.uniforms=Ae.uniforms;const Ye=Z.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ye.clippingPlanes=ge.uniform),_h(R,Ae),Z.needsLights=nx(R),Z.lightsStateVersion=Te,Z.needsLights&&(Ye.ambientLightColor.value=J.state.ambient,Ye.lightProbe.value=J.state.probe,Ye.directionalLights.value=J.state.directional,Ye.directionalLightShadows.value=J.state.directionalShadow,Ye.spotLights.value=J.state.spot,Ye.spotLightShadows.value=J.state.spotShadow,Ye.rectAreaLights.value=J.state.rectArea,Ye.ltc_1.value=J.state.rectAreaLTC1,Ye.ltc_2.value=J.state.rectAreaLTC2,Ye.pointLights.value=J.state.point,Ye.pointLightShadows.value=J.state.pointShadow,Ye.hemisphereLights.value=J.state.hemi,Ye.directionalShadowMap.value=J.state.directionalShadowMap,Ye.directionalShadowMatrix.value=J.state.directionalShadowMatrix,Ye.spotShadowMap.value=J.state.spotShadowMap,Ye.spotLightMatrix.value=J.state.spotLightMatrix,Ye.spotLightMap.value=J.state.spotLightMap,Ye.pointShadowMap.value=J.state.pointShadowMap,Ye.pointShadowMatrix.value=J.state.pointShadowMatrix),Z.currentProgram=je,Z.uniformsList=null,je}function vh(R){if(R.uniformsList===null){const X=R.currentProgram.getUniforms();R.uniformsList=Al.seqWithValue(X.seq,R.uniforms)}return R.uniformsList}function _h(R,X){const ie=Le.get(R);ie.outputColorSpace=X.outputColorSpace,ie.batching=X.batching,ie.instancing=X.instancing,ie.instancingColor=X.instancingColor,ie.instancingMorph=X.instancingMorph,ie.skinning=X.skinning,ie.morphTargets=X.morphTargets,ie.morphNormals=X.morphNormals,ie.morphColors=X.morphColors,ie.morphTargetsCount=X.morphTargetsCount,ie.numClippingPlanes=X.numClippingPlanes,ie.numIntersection=X.numClipIntersection,ie.vertexAlphas=X.vertexAlphas,ie.vertexTangents=X.vertexTangents,ie.toneMapping=X.toneMapping}function ex(R,X,ie,Z,J){X.isScene!==!0&&(X=pe),De.resetTextureUnits();const _e=X.fog,Te=Z.isMeshStandardMaterial?X.environment:null,Ae=E===null?_.outputColorSpace:E.isXRRenderTarget===!0?E.texture.colorSpace:yr,Ie=(Z.isMeshStandardMaterial?N:rt).get(Z.envMap||Te),Fe=Z.vertexColors===!0&&!!ie.attributes.color&&ie.attributes.color.itemSize===4,je=!!ie.attributes.tangent&&(!!Z.normalMap||Z.anisotropy>0),Ye=!!ie.morphAttributes.position,wt=!!ie.morphAttributes.normal,Wt=!!ie.morphAttributes.color;let pn=cr;Z.toneMapped&&(E===null||E.isXRRenderTarget===!0)&&(pn=_.toneMapping);const hi=ie.morphAttributes.position||ie.morphAttributes.normal||ie.morphAttributes.color,it=hi!==void 0?hi.length:0,Oe=Le.get(Z),co=m.state.lights;if(k===!0&&(I===!0||R!==A)){const Rn=R===A&&Z.id===P;ge.setState(Z,R,Rn)}let pt=!1;Z.version===Oe.__version?(Oe.needsLights&&Oe.lightsStateVersion!==co.state.version||Oe.outputColorSpace!==Ae||J.isBatchedMesh&&Oe.batching===!1||!J.isBatchedMesh&&Oe.batching===!0||J.isInstancedMesh&&Oe.instancing===!1||!J.isInstancedMesh&&Oe.instancing===!0||J.isSkinnedMesh&&Oe.skinning===!1||!J.isSkinnedMesh&&Oe.skinning===!0||J.isInstancedMesh&&Oe.instancingColor===!0&&J.instanceColor===null||J.isInstancedMesh&&Oe.instancingColor===!1&&J.instanceColor!==null||J.isInstancedMesh&&Oe.instancingMorph===!0&&J.morphTexture===null||J.isInstancedMesh&&Oe.instancingMorph===!1&&J.morphTexture!==null||Oe.envMap!==Ie||Z.fog===!0&&Oe.fog!==_e||Oe.numClippingPlanes!==void 0&&(Oe.numClippingPlanes!==ge.numPlanes||Oe.numIntersection!==ge.numIntersection)||Oe.vertexAlphas!==Fe||Oe.vertexTangents!==je||Oe.morphTargets!==Ye||Oe.morphNormals!==wt||Oe.morphColors!==Wt||Oe.toneMapping!==pn||Oe.morphTargetsCount!==it)&&(pt=!0):(pt=!0,Oe.__version=Z.version);let Mr=Oe.currentProgram;pt===!0&&(Mr=Sa(Z,X,J));let xh=!1,uo=!1,Ic=!1;const Xt=Mr.getUniforms(),Fi=Oe.uniforms;if(xe.useProgram(Mr.program)&&(xh=!0,uo=!0,Ic=!0),Z.id!==P&&(P=Z.id,uo=!0),xh||A!==R){Xt.setValue(U,"projectionMatrix",R.projectionMatrix),Xt.setValue(U,"viewMatrix",R.matrixWorldInverse);const Rn=Xt.map.cameraPosition;Rn!==void 0&&Rn.setValue(U,ee.setFromMatrixPosition(R.matrixWorld)),We.logarithmicDepthBuffer&&Xt.setValue(U,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(Z.isMeshPhongMaterial||Z.isMeshToonMaterial||Z.isMeshLambertMaterial||Z.isMeshBasicMaterial||Z.isMeshStandardMaterial||Z.isShaderMaterial)&&Xt.setValue(U,"isOrthographic",R.isOrthographicCamera===!0),A!==R&&(A=R,uo=!0,Ic=!0)}if(J.isSkinnedMesh){Xt.setOptional(U,J,"bindMatrix"),Xt.setOptional(U,J,"bindMatrixInverse");const Rn=J.skeleton;Rn&&(Rn.boneTexture===null&&Rn.computeBoneTexture(),Xt.setValue(U,"boneTexture",Rn.boneTexture,De))}J.isBatchedMesh&&(Xt.setOptional(U,J,"batchingTexture"),Xt.setValue(U,"batchingTexture",J._matricesTexture,De));const Dc=ie.morphAttributes;if((Dc.position!==void 0||Dc.normal!==void 0||Dc.color!==void 0)&&be.update(J,ie,Mr),(uo||Oe.receiveShadow!==J.receiveShadow)&&(Oe.receiveShadow=J.receiveShadow,Xt.setValue(U,"receiveShadow",J.receiveShadow)),Z.isMeshGouraudMaterial&&Z.envMap!==null&&(Fi.envMap.value=Ie,Fi.flipEnvMap.value=Ie.isCubeTexture&&Ie.isRenderTargetTexture===!1?-1:1),Z.isMeshStandardMaterial&&Z.envMap===null&&X.environment!==null&&(Fi.envMapIntensity.value=X.environmentIntensity),uo&&(Xt.setValue(U,"toneMappingExposure",_.toneMappingExposure),Oe.needsLights&&tx(Fi,Ic),_e&&Z.fog===!0&&ce.refreshFogUniforms(Fi,_e),ce.refreshMaterialUniforms(Fi,Z,$,Q,m.state.transmissionRenderTarget[R.id]),Al.upload(U,vh(Oe),Fi,De)),Z.isShaderMaterial&&Z.uniformsNeedUpdate===!0&&(Al.upload(U,vh(Oe),Fi,De),Z.uniformsNeedUpdate=!1),Z.isSpriteMaterial&&Xt.setValue(U,"center",J.center),Xt.setValue(U,"modelViewMatrix",J.modelViewMatrix),Xt.setValue(U,"normalMatrix",J.normalMatrix),Xt.setValue(U,"modelMatrix",J.matrixWorld),Z.isShaderMaterial||Z.isRawShaderMaterial){const Rn=Z.uniformsGroups;for(let Uc=0,ix=Rn.length;Uc<ix;Uc++){const yh=Rn[Uc];Xe.update(yh,Mr),Xe.bind(yh,Mr)}}return Mr}function tx(R,X){R.ambientLightColor.needsUpdate=X,R.lightProbe.needsUpdate=X,R.directionalLights.needsUpdate=X,R.directionalLightShadows.needsUpdate=X,R.pointLights.needsUpdate=X,R.pointLightShadows.needsUpdate=X,R.spotLights.needsUpdate=X,R.spotLightShadows.needsUpdate=X,R.rectAreaLights.needsUpdate=X,R.hemisphereLights.needsUpdate=X}function nx(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return b},this.getRenderTarget=function(){return E},this.setRenderTargetTextures=function(R,X,ie){Le.get(R.texture).__webglTexture=X,Le.get(R.depthTexture).__webglTexture=ie;const Z=Le.get(R);Z.__hasExternalTextures=!0,Z.__autoAllocateDepthBuffer=ie===void 0,Z.__autoAllocateDepthBuffer||de.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),Z.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(R,X){const ie=Le.get(R);ie.__webglFramebuffer=X,ie.__useDefaultFramebuffer=X===void 0},this.setRenderTarget=function(R,X=0,ie=0){E=R,T=X,b=ie;let Z=!0,J=null,_e=!1,Te=!1;if(R){const Ie=Le.get(R);Ie.__useDefaultFramebuffer!==void 0?(xe.bindFramebuffer(U.FRAMEBUFFER,null),Z=!1):Ie.__webglFramebuffer===void 0?De.setupRenderTarget(R):Ie.__hasExternalTextures&&De.rebindTextures(R,Le.get(R.texture).__webglTexture,Le.get(R.depthTexture).__webglTexture);const Fe=R.texture;(Fe.isData3DTexture||Fe.isDataArrayTexture||Fe.isCompressedArrayTexture)&&(Te=!0);const je=Le.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(je[X])?J=je[X][ie]:J=je[X],_e=!0):R.samples>0&&De.useMultisampledRTT(R)===!1?J=Le.get(R).__webglMultisampledFramebuffer:Array.isArray(je)?J=je[ie]:J=je,S.copy(R.viewport),D.copy(R.scissor),B=R.scissorTest}else S.copy(W).multiplyScalar($).floor(),D.copy(z).multiplyScalar($).floor(),B=re;if(xe.bindFramebuffer(U.FRAMEBUFFER,J)&&Z&&xe.drawBuffers(R,J),xe.viewport(S),xe.scissor(D),xe.setScissorTest(B),_e){const Ie=Le.get(R.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+X,Ie.__webglTexture,ie)}else if(Te){const Ie=Le.get(R.texture),Fe=X||0;U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,Ie.__webglTexture,ie||0,Fe)}P=-1},this.readRenderTargetPixels=function(R,X,ie,Z,J,_e,Te){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ae=Le.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Te!==void 0&&(Ae=Ae[Te]),Ae){xe.bindFramebuffer(U.FRAMEBUFFER,Ae);try{const Ie=R.texture,Fe=Ie.format,je=Ie.type;if(!We.textureFormatReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!We.textureTypeReadable(je)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}X>=0&&X<=R.width-Z&&ie>=0&&ie<=R.height-J&&U.readPixels(X,ie,Z,J,Se.convert(Fe),Se.convert(je),_e)}finally{const Ie=E!==null?Le.get(E).__webglFramebuffer:null;xe.bindFramebuffer(U.FRAMEBUFFER,Ie)}}},this.copyFramebufferToTexture=function(R,X,ie=0){const Z=Math.pow(2,-ie),J=Math.floor(X.image.width*Z),_e=Math.floor(X.image.height*Z);De.setTexture2D(X,0),U.copyTexSubImage2D(U.TEXTURE_2D,ie,0,0,R.x,R.y,J,_e),xe.unbindTexture()},this.copyTextureToTexture=function(R,X,ie,Z=0){const J=X.image.width,_e=X.image.height,Te=Se.convert(ie.format),Ae=Se.convert(ie.type);De.setTexture2D(ie,0),U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,ie.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,ie.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,ie.unpackAlignment),X.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,Z,R.x,R.y,J,_e,Te,Ae,X.image.data):X.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,Z,R.x,R.y,X.mipmaps[0].width,X.mipmaps[0].height,Te,X.mipmaps[0].data):U.texSubImage2D(U.TEXTURE_2D,Z,R.x,R.y,Te,Ae,X.image),Z===0&&ie.generateMipmaps&&U.generateMipmap(U.TEXTURE_2D),xe.unbindTexture()},this.copyTextureToTexture3D=function(R,X,ie,Z,J=0){const _e=R.max.x-R.min.x,Te=R.max.y-R.min.y,Ae=R.max.z-R.min.z,Ie=Se.convert(Z.format),Fe=Se.convert(Z.type);let je;if(Z.isData3DTexture)De.setTexture3D(Z,0),je=U.TEXTURE_3D;else if(Z.isDataArrayTexture||Z.isCompressedArrayTexture)De.setTexture2DArray(Z,0),je=U.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,Z.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Z.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,Z.unpackAlignment);const Ye=U.getParameter(U.UNPACK_ROW_LENGTH),wt=U.getParameter(U.UNPACK_IMAGE_HEIGHT),Wt=U.getParameter(U.UNPACK_SKIP_PIXELS),pn=U.getParameter(U.UNPACK_SKIP_ROWS),hi=U.getParameter(U.UNPACK_SKIP_IMAGES),it=ie.isCompressedTexture?ie.mipmaps[J]:ie.image;U.pixelStorei(U.UNPACK_ROW_LENGTH,it.width),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,it.height),U.pixelStorei(U.UNPACK_SKIP_PIXELS,R.min.x),U.pixelStorei(U.UNPACK_SKIP_ROWS,R.min.y),U.pixelStorei(U.UNPACK_SKIP_IMAGES,R.min.z),ie.isDataTexture||ie.isData3DTexture?U.texSubImage3D(je,J,X.x,X.y,X.z,_e,Te,Ae,Ie,Fe,it.data):Z.isCompressedArrayTexture?U.compressedTexSubImage3D(je,J,X.x,X.y,X.z,_e,Te,Ae,Ie,it.data):U.texSubImage3D(je,J,X.x,X.y,X.z,_e,Te,Ae,Ie,Fe,it),U.pixelStorei(U.UNPACK_ROW_LENGTH,Ye),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,wt),U.pixelStorei(U.UNPACK_SKIP_PIXELS,Wt),U.pixelStorei(U.UNPACK_SKIP_ROWS,pn),U.pixelStorei(U.UNPACK_SKIP_IMAGES,hi),J===0&&Z.generateMipmaps&&U.generateMipmap(je),xe.unbindTexture()},this.initTexture=function(R){R.isCubeTexture?De.setTextureCube(R,0):R.isData3DTexture?De.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?De.setTexture2DArray(R,0):De.setTexture2D(R,0),xe.unbindTexture()},this.resetState=function(){T=0,b=0,E=null,xe.reset(),ke.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ai}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===th?"display-p3":"srgb",t.unpackColorSpace=st.workingColorSpace===Rc?"display-p3":"srgb"}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class ac extends Ot{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new di,this.environmentIntensity=1,this.environmentRotation=new di,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class zu extends Qt{constructor(e,t,i,r,s,o,a,l,c,u,h,p){super(null,o,a,l,c,u,r,s,h,p),this.isCompressedTexture=!0,this.image={width:t,height:i},this.mipmaps=e,this.flipY=!1,this.generateMipmaps=!1}}class Fb extends Qt{constructor(e,t,i,r,s,o,a,l,c){super(e,t,i,r,s,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class uh extends ii{constructor(e=1,t=1,i=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const u=[],h=[],p=[],f=[];let g=0;const y=[],m=i/2;let d=0;v(),o===!1&&(e>0&&_(!0),t>0&&_(!1)),this.setIndex(u),this.setAttribute("position",new kt(h,3)),this.setAttribute("normal",new kt(p,3)),this.setAttribute("uv",new kt(f,2));function v(){const M=new O,T=new O;let b=0;const E=(t-e)/i;for(let P=0;P<=s;P++){const A=[],S=P/s,D=S*(t-e)+e;for(let B=0;B<=r;B++){const L=B/r,V=L*l+a,j=Math.sin(V),Q=Math.cos(V);T.x=D*j,T.y=-S*i+m,T.z=D*Q,h.push(T.x,T.y,T.z),M.set(j,E,Q).normalize(),p.push(M.x,M.y,M.z),f.push(L,1-S),A.push(g++)}y.push(A)}for(let P=0;P<r;P++)for(let A=0;A<s;A++){const S=y[A][P],D=y[A+1][P],B=y[A+1][P+1],L=y[A][P+1];u.push(S,D,L),u.push(D,B,L),b+=6}c.addGroup(d,b,0),d+=b}function _(M){const T=g,b=new we,E=new O;let P=0;const A=M===!0?e:t,S=M===!0?1:-1;for(let B=1;B<=r;B++)h.push(0,m*S,0),p.push(0,S,0),f.push(.5,.5),g++;const D=g;for(let B=0;B<=r;B++){const V=B/r*l+a,j=Math.cos(V),Q=Math.sin(V);E.x=A*Q,E.y=m*S,E.z=A*j,h.push(E.x,E.y,E.z),p.push(0,S,0),b.x=j*.5+.5,b.y=Q*.5*S+.5,f.push(b.x,b.y),g++}for(let B=0;B<r;B++){const L=T+B,V=D+B;M===!0?u.push(V,V+1,L):u.push(V+1,V,L),P+=3}c.addGroup(d,P,M===!0?1:2),d+=P}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new uh(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Lc extends ii{constructor(e=1,t=32,i=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const l=Math.min(o+a,Math.PI);let c=0;const u=[],h=new O,p=new O,f=[],g=[],y=[],m=[];for(let d=0;d<=i;d++){const v=[],_=d/i;let M=0;d===0&&o===0?M=.5/t:d===i&&l===Math.PI&&(M=-.5/t);for(let T=0;T<=t;T++){const b=T/t;h.x=-e*Math.cos(r+b*s)*Math.sin(o+_*a),h.y=e*Math.cos(o+_*a),h.z=e*Math.sin(r+b*s)*Math.sin(o+_*a),g.push(h.x,h.y,h.z),p.copy(h).normalize(),y.push(p.x,p.y,p.z),m.push(b+M,1-_),v.push(c++)}u.push(v)}for(let d=0;d<i;d++)for(let v=0;v<t;v++){const _=u[d][v+1],M=u[d][v],T=u[d+1][v],b=u[d+1][v+1];(d!==0||o>0)&&f.push(_,M,b),(d!==i-1||l<Math.PI)&&f.push(M,T,b)}this.setIndex(f),this.setAttribute("position",new kt(g,3)),this.setAttribute("normal",new kt(y,3)),this.setAttribute("uv",new kt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Lc(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class dh extends ii{constructor(e=1,t=.4,i=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:r,arc:s},i=Math.floor(i),r=Math.floor(r);const o=[],a=[],l=[],c=[],u=new O,h=new O,p=new O;for(let f=0;f<=i;f++)for(let g=0;g<=r;g++){const y=g/r*s,m=f/i*Math.PI*2;h.x=(e+t*Math.cos(m))*Math.cos(y),h.y=(e+t*Math.cos(m))*Math.sin(y),h.z=t*Math.sin(m),a.push(h.x,h.y,h.z),u.x=e*Math.cos(y),u.y=e*Math.sin(y),p.subVectors(h,u).normalize(),l.push(p.x,p.y,p.z),c.push(g/r),c.push(f/i)}for(let f=1;f<=i;f++)for(let g=1;g<=r;g++){const y=(r+1)*f+g-1,m=(r+1)*(f-1)+g-1,d=(r+1)*(f-1)+g,v=(r+1)*f+g;o.push(y,m,v),o.push(m,d,v)}this.setIndex(o),this.setAttribute("position",new kt(a,3)),this.setAttribute("normal",new kt(l,3)),this.setAttribute("uv",new kt(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new dh(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Ob extends Vt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class $n extends Ma{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new He(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new He(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=C_,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new di,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class X_ extends Ot{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new He(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}const Bu=new Qe,sg=new O,og=new O;class kb{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.map=null,this.mapPass=null,this.matrix=new Qe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ah,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new Ut(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;sg.setFromMatrixPosition(e.matrixWorld),t.position.copy(sg),og.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(og),t.updateMatrixWorld(),Bu.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Bu),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Bu)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class zb extends kb{constructor(){super(new lh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Hu extends X_{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ot.DEFAULT_UP),this.updateMatrix(),this.target=new Ot,this.shadow=new zb}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Bb extends X_{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Hb{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=ag(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=ag();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function ag(){return(typeof performance>"u"?Date:performance).now()}const fh="\\[\\]\\.:\\/",Vb=new RegExp("["+fh+"]","g"),hh="[^"+fh+"]",jb="[^"+fh.replace("\\.","")+"]",Gb=/((?:WC+[\/:])*)/.source.replace("WC",hh),Wb=/(WCOD+)?/.source.replace("WCOD",jb),Xb=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",hh),$b=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",hh),Yb=new RegExp("^"+Gb+Wb+Xb+$b+"$"),qb=["material","materials","bones","map"];class Kb{constructor(e,t,i){const r=i||tt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();const i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,t)}setValue(e,t){const i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}}class tt{constructor(e,t,i){this.path=t,this.parsedPath=i||tt.parseTrackName(t),this.node=tt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new tt.Composite(e,t,i):new tt(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Vb,"")}static parseTrackName(e){const t=Yb.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=i.nodeName.substring(r+1);qb.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){const i=function(s){for(let o=0;o<s.length;o++){const a=s[o];if(a.name===t||a.uuid===t)return a;const l=i(a.children);if(l)return l}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[t++]=i[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,i=t.objectName,r=t.propertyName;let s=t.propertyIndex;if(e||(e=tt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=t.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const o=e[r];if(o===void 0){const c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}tt.Composite=Kb;tt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};tt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};tt.prototype.GetterByBindingType=[tt.prototype._getValue_direct,tt.prototype._getValue_array,tt.prototype._getValue_arrayElement,tt.prototype._getValue_toArray];tt.prototype.SetterByBindingTypeAndVersioning=[[tt.prototype._setValue_direct,tt.prototype._setValue_direct_setNeedsUpdate,tt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_array,tt.prototype._setValue_array_setNeedsUpdate,tt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_arrayElement,tt.prototype._setValue_arrayElement_setNeedsUpdate,tt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[tt.prototype._setValue_fromArray,tt.prototype._setValue_fromArray_setNeedsUpdate,tt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class ph{constructor(e){this.value=e}clone(){return new ph(this.value.clone===void 0?this.value:this.value.clone())}}const lg=new Qe;class $_{constructor(e,t,i=0,r=1/0){this.ray=new sh(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new oh,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return lg.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(lg),this}intersectObject(e,t=!0,i=[]){return tf(e,this,i,t),i.sort(cg),i}intersectObjects(e,t=!0,i=[]){for(let r=0,s=e.length;r<s;r++)tf(e[r],this,i,t);return i.sort(cg),i}}function cg(n,e){return n.distance-e.distance}function tf(n,e,t,i){if(n.layers.test(e.layers)&&n.raycast(e,t),i===!0){const r=n.children;for(let s=0,o=r.length;s<o;s++)tf(r[s],e,t,!0)}}class lc{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Jt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:bc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=bc);const ug={type:"change"},Vu={type:"start"},dg={type:"end"},al=new sh,fg=new $i,Zb=Math.cos(70*Js.DEG2RAD);class Jb extends $r{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new O,this.cursor=new O,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Pr.ROTATE,MIDDLE:Pr.DOLLY,RIGHT:Pr.PAN},this.touches={ONE:Kr.ROTATE,TWO:Kr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return a.phi},this.getAzimuthalAngle=function(){return a.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(w){w.addEventListener("keydown",Ue),this._domElementKeyEvents=w},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",Ue),this._domElementKeyEvents=null},this.saveState=function(){i.target0.copy(i.target),i.position0.copy(i.object.position),i.zoom0=i.object.zoom},this.reset=function(){i.target.copy(i.target0),i.object.position.copy(i.position0),i.object.zoom=i.zoom0,i.object.updateProjectionMatrix(),i.dispatchEvent(ug),i.update(),s=r.NONE},this.update=function(){const w=new O,G=new Bt().setFromUnitVectors(e.up,new O(0,1,0)),q=G.clone().invert(),ae=new O,fe=new Bt,ze=new O,$e=2*Math.PI;return function(Lt=null){const et=i.object.position;w.copy(et).sub(i.target),w.applyQuaternion(G),a.setFromVector3(w),i.autoRotate&&s===r.NONE&&B(S(Lt)),i.enableDamping?(a.theta+=l.theta*i.dampingFactor,a.phi+=l.phi*i.dampingFactor):(a.theta+=l.theta,a.phi+=l.phi);let Et=i.minAzimuthAngle,dt=i.maxAzimuthAngle;isFinite(Et)&&isFinite(dt)&&(Et<-Math.PI?Et+=$e:Et>Math.PI&&(Et-=$e),dt<-Math.PI?dt+=$e:dt>Math.PI&&(dt-=$e),Et<=dt?a.theta=Math.max(Et,Math.min(dt,a.theta)):a.theta=a.theta>(Et+dt)/2?Math.max(Et,a.theta):Math.min(dt,a.theta)),a.phi=Math.max(i.minPolarAngle,Math.min(i.maxPolarAngle,a.phi)),a.makeSafe(),i.enableDamping===!0?i.target.addScaledVector(u,i.dampingFactor):i.target.add(u),i.target.sub(i.cursor),i.target.clampLength(i.minTargetRadius,i.maxTargetRadius),i.target.add(i.cursor);let Di=!1;if(i.zoomToCursor&&b||i.object.isOrthographicCamera)a.radius=W(a.radius);else{const Cn=a.radius;a.radius=W(a.radius*c),Di=Cn!=a.radius}if(w.setFromSpherical(a),w.applyQuaternion(q),et.copy(i.target).add(w),i.object.lookAt(i.target),i.enableDamping===!0?(l.theta*=1-i.dampingFactor,l.phi*=1-i.dampingFactor,u.multiplyScalar(1-i.dampingFactor)):(l.set(0,0,0),u.set(0,0,0)),i.zoomToCursor&&b){let Cn=null;if(i.object.isPerspectiveCamera){const Ui=w.length();Cn=W(Ui*c);const fi=Ui-Cn;i.object.position.addScaledVector(M,fi),i.object.updateMatrixWorld(),Di=!!fi}else if(i.object.isOrthographicCamera){const Ui=new O(T.x,T.y,0);Ui.unproject(i.object);const fi=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),i.object.updateProjectionMatrix(),Di=fi!==i.object.zoom;const lo=new O(T.x,T.y,0);lo.unproject(i.object),i.object.position.sub(lo).add(Ui),i.object.updateMatrixWorld(),Cn=w.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),i.zoomToCursor=!1;Cn!==null&&(this.screenSpacePanning?i.target.set(0,0,-1).transformDirection(i.object.matrix).multiplyScalar(Cn).add(i.object.position):(al.origin.copy(i.object.position),al.direction.set(0,0,-1).transformDirection(i.object.matrix),Math.abs(i.object.up.dot(al.direction))<Zb?e.lookAt(i.target):(fg.setFromNormalAndCoplanarPoint(i.object.up,i.target),al.intersectPlane(fg,i.target))))}else if(i.object.isOrthographicCamera){const Cn=i.object.zoom;i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/c)),Cn!==i.object.zoom&&(i.object.updateProjectionMatrix(),Di=!0)}return c=1,b=!1,Di||ae.distanceToSquared(i.object.position)>o||8*(1-fe.dot(i.object.quaternion))>o||ze.distanceToSquared(i.target)>o?(i.dispatchEvent(ug),ae.copy(i.object.position),fe.copy(i.object.quaternion),ze.copy(i.target),!0):!1}}(),this.dispose=function(){i.domElement.removeEventListener("contextmenu",Ze),i.domElement.removeEventListener("pointerdown",N),i.domElement.removeEventListener("pointercancel",Y),i.domElement.removeEventListener("wheel",ce),i.domElement.removeEventListener("pointermove",C),i.domElement.removeEventListener("pointerup",Y),i.domElement.getRootNode().removeEventListener("keydown",ve,{capture:!0}),i._domElementKeyEvents!==null&&(i._domElementKeyEvents.removeEventListener("keydown",Ue),i._domElementKeyEvents=null)};const i=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let s=r.NONE;const o=1e-6,a=new lc,l=new lc;let c=1;const u=new O,h=new we,p=new we,f=new we,g=new we,y=new we,m=new we,d=new we,v=new we,_=new we,M=new O,T=new we;let b=!1;const E=[],P={};let A=!1;function S(w){return w!==null?2*Math.PI/60*i.autoRotateSpeed*w:2*Math.PI/60/60*i.autoRotateSpeed}function D(w){const G=Math.abs(w*.01);return Math.pow(.95,i.zoomSpeed*G)}function B(w){l.theta-=w}function L(w){l.phi-=w}const V=function(){const w=new O;return function(q,ae){w.setFromMatrixColumn(ae,0),w.multiplyScalar(-q),u.add(w)}}(),j=function(){const w=new O;return function(q,ae){i.screenSpacePanning===!0?w.setFromMatrixColumn(ae,1):(w.setFromMatrixColumn(ae,0),w.crossVectors(i.object.up,w)),w.multiplyScalar(q),u.add(w)}}(),Q=function(){const w=new O;return function(q,ae){const fe=i.domElement;if(i.object.isPerspectiveCamera){const ze=i.object.position;w.copy(ze).sub(i.target);let $e=w.length();$e*=Math.tan(i.object.fov/2*Math.PI/180),V(2*q*$e/fe.clientHeight,i.object.matrix),j(2*ae*$e/fe.clientHeight,i.object.matrix)}else i.object.isOrthographicCamera?(V(q*(i.object.right-i.object.left)/i.object.zoom/fe.clientWidth,i.object.matrix),j(ae*(i.object.top-i.object.bottom)/i.object.zoom/fe.clientHeight,i.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),i.enablePan=!1)}}();function $(w){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c/=w:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function F(w){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?c*=w:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function H(w,G){if(!i.zoomToCursor)return;b=!0;const q=i.domElement.getBoundingClientRect(),ae=w-q.left,fe=G-q.top,ze=q.width,$e=q.height;T.x=ae/ze*2-1,T.y=-(fe/$e)*2+1,M.set(T.x,T.y,1).unproject(i.object).sub(i.object.position).normalize()}function W(w){return Math.max(i.minDistance,Math.min(i.maxDistance,w))}function z(w){h.set(w.clientX,w.clientY)}function re(w){H(w.clientX,w.clientX),d.set(w.clientX,w.clientY)}function K(w){g.set(w.clientX,w.clientY)}function k(w){p.set(w.clientX,w.clientY),f.subVectors(p,h).multiplyScalar(i.rotateSpeed);const G=i.domElement;B(2*Math.PI*f.x/G.clientHeight),L(2*Math.PI*f.y/G.clientHeight),h.copy(p),i.update()}function I(w){v.set(w.clientX,w.clientY),_.subVectors(v,d),_.y>0?$(D(_.y)):_.y<0&&F(D(_.y)),d.copy(v),i.update()}function ne(w){y.set(w.clientX,w.clientY),m.subVectors(y,g).multiplyScalar(i.panSpeed),Q(m.x,m.y),g.copy(y),i.update()}function ee(w){H(w.clientX,w.clientY),w.deltaY<0?F(D(w.deltaY)):w.deltaY>0&&$(D(w.deltaY)),i.update()}function pe(w){let G=!1;switch(w.code){case i.keys.UP:w.ctrlKey||w.metaKey||w.shiftKey?L(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):Q(0,i.keyPanSpeed),G=!0;break;case i.keys.BOTTOM:w.ctrlKey||w.metaKey||w.shiftKey?L(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):Q(0,-i.keyPanSpeed),G=!0;break;case i.keys.LEFT:w.ctrlKey||w.metaKey||w.shiftKey?B(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):Q(i.keyPanSpeed,0),G=!0;break;case i.keys.RIGHT:w.ctrlKey||w.metaKey||w.shiftKey?B(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):Q(-i.keyPanSpeed,0),G=!0;break}G&&(w.preventDefault(),i.update())}function Ee(w){if(E.length===1)h.set(w.pageX,w.pageY);else{const G=at(w),q=.5*(w.pageX+G.x),ae=.5*(w.pageY+G.y);h.set(q,ae)}}function U(w){if(E.length===1)g.set(w.pageX,w.pageY);else{const G=at(w),q=.5*(w.pageX+G.x),ae=.5*(w.pageY+G.y);g.set(q,ae)}}function Me(w){const G=at(w),q=w.pageX-G.x,ae=w.pageY-G.y,fe=Math.sqrt(q*q+ae*ae);d.set(0,fe)}function de(w){i.enableZoom&&Me(w),i.enablePan&&U(w)}function We(w){i.enableZoom&&Me(w),i.enableRotate&&Ee(w)}function xe(w){if(E.length==1)p.set(w.pageX,w.pageY);else{const q=at(w),ae=.5*(w.pageX+q.x),fe=.5*(w.pageY+q.y);p.set(ae,fe)}f.subVectors(p,h).multiplyScalar(i.rotateSpeed);const G=i.domElement;B(2*Math.PI*f.x/G.clientHeight),L(2*Math.PI*f.y/G.clientHeight),h.copy(p)}function Pe(w){if(E.length===1)y.set(w.pageX,w.pageY);else{const G=at(w),q=.5*(w.pageX+G.x),ae=.5*(w.pageY+G.y);y.set(q,ae)}m.subVectors(y,g).multiplyScalar(i.panSpeed),Q(m.x,m.y),g.copy(y)}function Le(w){const G=at(w),q=w.pageX-G.x,ae=w.pageY-G.y,fe=Math.sqrt(q*q+ae*ae);v.set(0,fe),_.set(0,Math.pow(v.y/d.y,i.zoomSpeed)),$(_.y),d.copy(v);const ze=(w.pageX+G.x)*.5,$e=(w.pageY+G.y)*.5;H(ze,$e)}function De(w){i.enableZoom&&Le(w),i.enablePan&&Pe(w)}function rt(w){i.enableZoom&&Le(w),i.enableRotate&&xe(w)}function N(w){i.enabled!==!1&&(E.length===0&&(i.domElement.setPointerCapture(w.pointerId),i.domElement.addEventListener("pointermove",C),i.domElement.addEventListener("pointerup",Y)),!ke(w)&&(Ne(w),w.pointerType==="touch"?he(w):se(w)))}function C(w){i.enabled!==!1&&(w.pointerType==="touch"?be(w):le(w))}function Y(w){switch(Se(w),E.length){case 0:i.domElement.releasePointerCapture(w.pointerId),i.domElement.removeEventListener("pointermove",C),i.domElement.removeEventListener("pointerup",Y),i.dispatchEvent(dg),s=r.NONE;break;case 1:const G=E[0],q=P[G];he({pointerId:G,pageX:q.x,pageY:q.y});break}}function se(w){let G;switch(w.button){case 0:G=i.mouseButtons.LEFT;break;case 1:G=i.mouseButtons.MIDDLE;break;case 2:G=i.mouseButtons.RIGHT;break;default:G=-1}switch(G){case Pr.DOLLY:if(i.enableZoom===!1)return;re(w),s=r.DOLLY;break;case Pr.ROTATE:if(w.ctrlKey||w.metaKey||w.shiftKey){if(i.enablePan===!1)return;K(w),s=r.PAN}else{if(i.enableRotate===!1)return;z(w),s=r.ROTATE}break;case Pr.PAN:if(w.ctrlKey||w.metaKey||w.shiftKey){if(i.enableRotate===!1)return;z(w),s=r.ROTATE}else{if(i.enablePan===!1)return;K(w),s=r.PAN}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Vu)}function le(w){switch(s){case r.ROTATE:if(i.enableRotate===!1)return;k(w);break;case r.DOLLY:if(i.enableZoom===!1)return;I(w);break;case r.PAN:if(i.enablePan===!1)return;ne(w);break}}function ce(w){i.enabled===!1||i.enableZoom===!1||s!==r.NONE||(w.preventDefault(),i.dispatchEvent(Vu),ee(Ce(w)),i.dispatchEvent(dg))}function Ce(w){const G=w.deltaMode,q={clientX:w.clientX,clientY:w.clientY,deltaY:w.deltaY};switch(G){case 1:q.deltaY*=16;break;case 2:q.deltaY*=100;break}return w.ctrlKey&&!A&&(q.deltaY*=10),q}function ve(w){w.key==="Control"&&(A=!0,i.domElement.getRootNode().addEventListener("keyup",ge,{passive:!0,capture:!0}))}function ge(w){w.key==="Control"&&(A=!1,i.domElement.getRootNode().removeEventListener("keyup",ge,{passive:!0,capture:!0}))}function Ue(w){i.enabled===!1||i.enablePan===!1||pe(w)}function he(w){switch(Xe(w),E.length){case 1:switch(i.touches.ONE){case Kr.ROTATE:if(i.enableRotate===!1)return;Ee(w),s=r.TOUCH_ROTATE;break;case Kr.PAN:if(i.enablePan===!1)return;U(w),s=r.TOUCH_PAN;break;default:s=r.NONE}break;case 2:switch(i.touches.TWO){case Kr.DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;de(w),s=r.TOUCH_DOLLY_PAN;break;case Kr.DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;We(w),s=r.TOUCH_DOLLY_ROTATE;break;default:s=r.NONE}break;default:s=r.NONE}s!==r.NONE&&i.dispatchEvent(Vu)}function be(w){switch(Xe(w),s){case r.TOUCH_ROTATE:if(i.enableRotate===!1)return;xe(w),i.update();break;case r.TOUCH_PAN:if(i.enablePan===!1)return;Pe(w),i.update();break;case r.TOUCH_DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;De(w),i.update();break;case r.TOUCH_DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;rt(w),i.update();break;default:s=r.NONE}}function Ze(w){i.enabled!==!1&&w.preventDefault()}function Ne(w){E.push(w.pointerId)}function Se(w){delete P[w.pointerId];for(let G=0;G<E.length;G++)if(E[G]==w.pointerId){E.splice(G,1);return}}function ke(w){for(let G=0;G<E.length;G++)if(E[G]==w.pointerId)return!0;return!1}function Xe(w){let G=P[w.pointerId];G===void 0&&(G=new we,P[w.pointerId]=G),G.set(w.pageX,w.pageY)}function at(w){const G=w.pointerId===E[0]?E[1]:E[0];return P[G]}i.domElement.addEventListener("contextmenu",Ze),i.domElement.addEventListener("pointerdown",N),i.domElement.addEventListener("pointercancel",Y),i.domElement.addEventListener("wheel",ce,{passive:!1}),i.domElement.getRootNode().addEventListener("keydown",ve,{passive:!0,capture:!0}),this.update()}}const Y_={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class ao{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Qb=new lh(-1,1,1,-1,0,1);class eC extends ii{constructor(){super(),this.setAttribute("position",new kt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new kt([0,2,0,0,2,0],2))}}const tC=new eC;class mh{constructor(e){this._mesh=new At(tC,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Qb)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class nC extends ao{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof Vt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=pa.clone(e.uniforms),this.material=new Vt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new mh(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class hg extends ao{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const r=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),s.buffers.stencil.setFunc(r.ALWAYS,o,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(r.EQUAL,1,4294967295),s.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),s.buffers.stencil.setLocked(!0)}}class iC extends ao{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class rC{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new we);this._width=i.width,this._height=i.height,t=new ti(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ur}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new nC(Y_),this.copyPass.material.blending=Ci,this.clock=new Hb}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let r=0,s=this.passes.length;r<s;r++){const o=this.passes[r];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}hg!==void 0&&(o instanceof hg?i=!0:o instanceof iC&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new we);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class sC extends ao{constructor(e,t,i=null,r=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=r,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new He}render(e,t,i){const r=e.autoClear;e.autoClear=!1;let s,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=r}}const oC={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new He(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class eo extends ao{constructor(e,t,i,r){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=r,this.resolution=e!==void 0?new we(e.x,e.y):new we(256,256),this.clearColor=new He(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new ti(s,o,{type:ur}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const p=new ti(s,o,{type:ur});p.texture.name="UnrealBloomPass.h"+h,p.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(p);const f=new ti(s,o,{type:ur});f.texture.name="UnrealBloomPass.v"+h,f.texture.generateMipmaps=!1,this.renderTargetsVertical.push(f),s=Math.round(s/2),o=Math.round(o/2)}const a=oC;this.highPassUniforms=pa.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Vt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];s=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new we(1/s,1/o),s=Math.round(s/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const u=Y_;this.copyUniforms=pa.clone(u.uniforms),this.blendMaterial=new Vt({uniforms:this.copyUniforms,vertexShader:u.vertexShader,fragmentShader:u.fragmentShader,blending:qd,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new He,this.oldClearAlpha=1,this.basic=new Pc,this.fsQuad=new mh(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(i,r);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,r),this.renderTargetsVertical[s].setSize(i,r),this.separableBlurMaterials[s].uniforms.invSize.value=new we(1/i,1/r),i=Math.round(i/2),r=Math.round(r/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=eo.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=eo.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),a=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new Vt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new we(.5,.5)},direction:{value:new we(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}}eo.BlurDirectionX=new we(1,0);eo.BlurDirectionY=new we(0,1);const aC={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class lC extends ao{constructor(){super();const e=aC;this.uniforms=pa.clone(e.uniforms),this.material=new Ob({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new mh(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},st.getTransfer(this._outputColorSpace)===lt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===p_?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===m_?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===g_?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===eh?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===v_?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===__&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class cC{constructor(e){this.canvas=e,this._init()}_init(){const e=this.canvas,t=e.clientWidth,i=e.clientHeight;this.renderer=new W_({canvas:e,antialias:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.setSize(t,i,!1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=f_,this.renderer.toneMapping=eh,this.renderer.toneMappingExposure=.95,this.renderer.outputColorSpace=_n,this.scene=new ac,this.scene.background=new He(16052974),this.scene.fog=null,this.camera=new xn(52,t/i,.1,100),this.camera.position.set(3,4,10),this.camera.lookAt(3,0,0);const r=new Bb(13162736,1.5);this.scene.add(r);const s=new Hu(16777215,2.8);s.position.set(5,12,7),s.castShadow=!0,s.shadow.mapSize.width=2048,s.shadow.mapSize.height=2048,s.shadow.camera.near=.5,s.shadow.camera.far=50,s.shadow.camera.left=-10,s.shadow.camera.right=10,s.shadow.camera.top=10,s.shadow.camera.bottom=-10,s.shadow.bias=-4e-4,this.scene.add(s);const o=new Hu(11585776,.8);o.position.set(-5,4,-3),this.scene.add(o);const a=new Hu(15266047,.5);a.position.set(0,-3,-8),this.scene.add(a),this._buildGround(),this.controls=new Jb(this.camera,e),this.controls.enableDamping=!0,this.controls.dampingFactor=.07,this.controls.minDistance=3,this.controls.maxDistance=25,this.controls.maxPolarAngle=Math.PI*.48,this.controls.enablePan=!0,this.controls.screenSpacePanning=!0,this.controls.mouseButtons.MIDDLE=Pr.PAN,this.controls.target.set(3,0,0),this._buildPostProcessing(t,i),this._resizeObserver=new ResizeObserver(()=>this._onResize()),this._resizeObserver.observe(e.parentElement),oe.camera=this.camera,oe.animateTo=(l,c,u)=>this.animateCameraTo(l,c,u),oe.fitCamera=()=>this.fitCamera(),oe.orbitDelta=(l,c)=>{const u=this.controls.target.clone(),h=this.camera.position.clone().sub(u),p=new lc().setFromVector3(h);p.theta-=l*.008,p.phi=Math.max(.05,Math.min(Math.PI*.47,p.phi-c*.006)),h.setFromSpherical(p),this.camera.position.copy(u).add(h),this.controls.target.copy(u),this.controls.update()},requestAnimationFrame(()=>this._onResize())}_buildGround(){const t=new mr(1e3,1e3),i=new $n({color:13814978,roughness:.95,metalness:0,transparent:!0,opacity:.13,depthWrite:!1}),r=new At(t,i);r.rotation.x=-Math.PI/2,r.position.y=-3.2,r.receiveShadow=!0,this.scene.add(r),this.ground=r;const s=new mr(4e3,4e3),o=new Vt({transparent:!0,depthWrite:!1,side:Un,uniforms:{uCell:{value:1},uMajor:{value:10},uColor:{value:new He(10992082)},uColorMajor:{value:new He(8690104)},uCenter:{value:new O},uFade:{value:60}},vertexShader:`
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
      `});o.extensions={derivatives:!0};const a=new At(s,o);a.rotation.x=-Math.PI/2,a.position.y=-3.2+.01,a.renderOrder=1,a.frustumCulled=!1,this.scene.add(a),this.grid=a}applyTheme(e){const t=e==="dark";this._theme=e,this.scene.background=new He(t?856347:16052974),this.ground&&(this.ground.material.color.set(t?1119775:13814978),this.ground.material.opacity=t?.18:.13),this.grid&&(this.grid.material.uniforms.uColor.value.set(t?3358812:10992082),this.grid.material.uniforms.uColorMajor.value.set(t?5596570:8690104))}_updateGround(){const e=this.controls.target;if(this.ground&&(this.ground.position.x=e.x,this.ground.position.z=e.z),this.grid){this.grid.position.x=e.x,this.grid.position.z=e.z,this.grid.material.uniforms.uCenter.value.set(e.x,0,e.z);const t=this.camera.position.distanceTo(e);this.grid.material.uniforms.uFade.value=Js.clamp(t*2.2,30,600)}}_buildPostProcessing(e,t){this.composer=new rC(this.renderer);const i=new sC(this.scene,this.camera);this.composer.addPass(i),this.bloomPass=new eo(new we(e,t),.18,.25,.95),this.composer.addPass(this.bloomPass);const r=new lC;this.composer.addPass(r)}_onResize(){const e=this.canvas,t=e.clientWidth,i=e.clientHeight;t===0||i===0||(this.camera.aspect=t/i,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,i,!1),this.composer.setSize(t,i))}setOrbitEnabled(e){this.controls.enabled=e}animateCameraTo(e,t,i=700){const r=this.camera.position.clone(),s=this.controls.target.clone(),o=new O(...Object.values(e)),a=new O(...Object.values(t)),l=performance.now(),c=()=>{const u=Math.min((performance.now()-l)/i,1),h=uC(u);this.camera.position.lerpVectors(r,o,h),this.controls.target.lerpVectors(s,a,h),this.controls.update(),u<1&&requestAnimationFrame(c)};requestAnimationFrame(c)}fitCamera(){const e=oe.getArmNodes?oe.getArmNodes():null;if(!e||e.length===0)return;const t=e.map(u=>new O(u.x,u.y,u.z)),i=new O;t.forEach(u=>i.add(u)),i.divideScalar(t.length);let r=0;t.forEach(u=>{r=Math.max(r,u.distanceTo(i))}),r=Math.max(r,.5);const s=Js.degToRad(this.camera.fov/2),o=Math.max(r*1.45/Math.tan(s),4),a=this.camera.position.clone().sub(this.controls.target),l=new lc().setFromVector3(a);l.radius=o,l.phi=Math.max(.35,Math.min(Math.PI*.44,l.phi)),a.setFromSpherical(l);const c=i.clone().add(a);this.animateCameraTo({x:c.x,y:c.y,z:c.z},{x:i.x,y:i.y,z:i.z})}render(){this.controls.update(),this._updateGround(),this.composer.render()}dispose(){this._resizeObserver.disconnect(),this.renderer.dispose(),this.composer.dispose()}}function uC(n){return n<.5?2*n*n:-1+(4-2*n)*n}function dC(n){const e=new uh(Ip,Ip,n,6,1,!1,Math.PI/6);return e.applyMatrix4(new Qe().makeRotationZ(Math.PI/2)),e.applyMatrix4(new Qe().makeTranslation(n/2,0,0)),e}function fC(){return new Yr(yn,yn,yn*2)}const hC=(()=>{const n=new Yr(yn,yn,yn);return n.applyMatrix4(new Qe().makeTranslation(yn/2,0,0)),n})(),pC=new Lc(Zl,20,20),pg=new dh(Zl*1.55,Zl*.22,10,28),mC=new Lc(Zl*1.3,20,20),Nn={rod:()=>new $n({color:8032170,roughness:.38,metalness:.55,flatShading:!0}),rodRoot:()=>new $n({color:16755234,roughness:.18,metalness:.75,emissive:16746496,emissiveIntensity:.4,flatShading:!0}),rodHover:()=>new $n({color:10402e3,roughness:.2,metalness:.88,emissive:1721480,emissiveIntensity:.22,flatShading:!0}),endRod:()=>new $n({color:13213728,roughness:.22,metalness:.78,emissive:9067008,emissiveIntensity:.08}),endRodRoot:()=>new $n({color:16763972,roughness:.14,metalness:.82,emissive:16750848,emissiveIntensity:.55}),twistJoint:()=>new $n({color:14509568,roughness:.25,metalness:.7,emissive:13386752,emissiveIntensity:.3}),twistJointLimit:()=>new $n({color:16720384,roughness:.25,metalness:.6,emissive:16720384,emissiveIntensity:.9}),bendJoint:()=>new $n({color:2767442,roughness:.32,metalness:.78,emissive:21964,emissiveIntensity:.18}),bendJointLimit:()=>new $n({color:16720384,roughness:.2,metalness:.6,emissive:16720384,emissiveIntensity:.9}),jointRing:()=>new $n({color:4478310,roughness:.3,metalness:.85})};class ju{constructor(e){this.scene=e,this.robotGroup=new Ns,e.add(this.robotGroup),this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._facesVisible=!1,this._activeRootId="R1",this._build("R1",[0,0,0,0,0,0]),this._addFacePlanes()}computeAnglesForRoot(e,t="horizontal"){const i={};for(const u of Zn){const h=this._rodMeshes[u];i[u]=h?h.getWorldQuaternion(new Bt):new Bt}const r=this._rodMeshes[e],s=r?r.getWorldPosition(new O):new O,o=i[e].clone(),a=[0,0,0,0,0,0],l=new Set,c=(u,h)=>{l.add(u);for(let p=0;p<yt.length;p++){const f=yt[p],g=f.bodyA===u,y=f.bodyB===u;if(!g&&!y)continue;const m=g?f.bodyB:f.bodyA;if(l.has(m))continue;const d=i[m],v=h.clone().invert().multiply(d);let _;if(f.type==="bend"){const E=new O(1,0,0).applyQuaternion(v);t==="vertical"?_=Math.atan2(E.y,E.x):_=Math.atan2(-E.z,E.x)}else{const E=new O(0,1,0).applyQuaternion(v);_=Math.atan2(E.z,E.y)}_=Math.max(-f.limit,Math.min(f.limit,_)),a[p]=_;const M=f.type==="bend"?new O(0,1,0):new O(1,0,0),T=new Bt().setFromAxisAngle(M,_),b=h.clone().multiply(T);c(m,b)}};return c(e,o),{newAngles:a,rootPos:s,rootQuat:o}}rebuild(e,t,i=null,r=null){for(this._activeRootId=e;this.robotGroup.children.length>0;)this.robotGroup.remove(this.robotGroup.children[0]);this._rodMeshes={},this._rodMats={},this._jointNodes={},this._jointSphereMeshes={},this._tipR1=null,this._tipR7=null,this._r3CuboidMesh=null,this._facePlaneMeshes=[],this._build(e,t),this._addFacePlanes(),this._facesVisible&&this.showFaceIndicators(!0),this.robotGroup.position.copy(i??new O),this.robotGroup.quaternion.copy(r??new Bt)}updateAngles(e,t="horizontal"){for(let i=0;i<yt.length;i++){const r=yt[i],s=this._jointNodes[r.id];s&&(r.type==="twist"?s.rotation.x=e[i]:t==="vertical"?(s.rotation.z=e[i],s.rotation.y=0):(s.rotation.y=e[i],s.rotation.z=0))}}setHoverHighlight(e,t){const i=this._rodMats[e];if(!i||e===this._activeRootId)return;const r=this._rodMeshes[e];r&&(r.material=t?i.hover:i.normal,e==="R3"&&this._r3CuboidMesh&&(this._r3CuboidMesh.material=t?i.hover:i.normal))}setLimitHighlight(e,t){const i=this._jointSphereMeshes[e];i&&(i.mesh.material=t?i.limitMat:i.normalMat)}get interactables(){const e=Object.values(this._rodMeshes);return this._r3CuboidMesh&&e.push(this._r3CuboidMesh),e}getEndEffectorWorld(){const i=Zn.indexOf(this._activeRootId)<=3?this._tipR7:this._tipR1;if(!i)return{x:0,y:0,z:0};const r=new O;return i.getWorldPosition(r),{x:r.x,y:r.y,z:r.z}}getNodePositions(){this.robotGroup.updateMatrixWorld(!0);const e=new O;return["J1","J2","J3","J4","J5","J6"].map(t=>{const i=this._jointNodes[t];return i?i.getWorldPosition(e.clone()):new O})}_build(e,t){const i=this._makeRodMesh(e,!0);i.position.set(0,0,0),this.robotGroup.add(i),e==="R1"?(this._tipR1=this._makeTip(),this._tipR1.position.set(this._rodLen("R1"),0,0),i.add(this._tipR1)):e==="R7"&&(this._tipR7=this._makeTip(),this._tipR7.position.set(0,0,0),i.add(this._tipR7)),this._traverseFrom(e,i,t,new Set([e]))}_traverseFrom(e,t,i,r){for(let s=0;s<yt.length;s++){const o=yt[s],a=o.bodyA===e,l=o.bodyB===e;if(!a&&!l)continue;const c=a?o.bodyB:o.bodyA;if(r.has(c))continue;r.add(c);const u=new Ot;u.name=o.id+"_pivot",this._addJointVisual(u,o),a?u.position.set(this._rodLen(e),0,0):u.position.set(0,0,0);const h=i[s]??0;o.type==="twist"?u.rotation.x=h:u.rotation.y=h,this._jointNodes[o.id]=u,t.add(u);const p=this._makeRodMesh(c,!1);if(a?p.position.set(0,0,0):p.position.set(-this._rodLen(c),0,0),u.add(p),c==="R1"){const f=this._makeTip();f.position.set(0,0,0),p.add(f),this._tipR1=f}else if(c==="R7"){const f=this._makeTip();a?f.position.set(this._rodLen("R7"),0,0):f.position.set(0,0,0),p.add(f),this._tipR7=f}this._traverseFrom(c,p,i,r)}}_rodLen(e){return e==="R1"||e==="R7"?yn:gs[e]??iS}_makeRodMesh(e,t){const i=e==="R1"||e==="R7",r=i?hC:dC(this._rodLen(e));let s,o,a;i?(s=Nn.endRod(),o=Nn.endRodRoot(),a=Nn.rodHover()):(s=Nn.rod(),o=Nn.rodRoot(),a=Nn.rodHover());const l=new At(r,t?o:s);if(l.castShadow=!0,l.receiveShadow=!0,l.userData={type:"rod",id:e},l.name=e,this._rodMeshes[e]=l,this._rodMats[e]={normal:s,root:o,hover:a},e==="R3"){const c=t?o.clone():s.clone(),u=new At(fC(),c);u.castShadow=!0,u.receiveShadow=!0,u.userData={type:"rod",id:"R3"},u.name="R3_cuboid",u.position.set(this._rodLen("R3")/2,0,0),l.add(u),this._r3CuboidMesh=u}return l}_addJointVisual(e,t){if(t.type==="twist"){const i=Nn.twistJoint(),r=Nn.twistJointLimit(),s=new At(mC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[t.id]={mesh:s,normalMat:i,limitMat:r}}else{const i=Nn.bendJoint(),r=Nn.bendJointLimit(),s=new At(pC,i);s.castShadow=!0,e.add(s),this._jointSphereMeshes[t.id]={mesh:s,normalMat:i,limitMat:r};const o=new At(pg,Nn.jointRing());o.castShadow=!0,e.add(o);const a=new At(pg,Nn.jointRing());a.rotation.x=Math.PI/2,a.castShadow=!0,e.add(a)}}getJointWorldData(e="horizontal"){this.robotGroup.updateMatrixWorld(!0);const t=new Bt;return yt.map(i=>{const r=this._jointNodes[i.id];if(!r)return{pos:new O,axis:new O(0,1,0)};const s=r.getWorldPosition(new O),o=i.type==="twist"?new O(1,0,0):e==="vertical"?new O(0,0,1):new O(0,1,0),a=r.parent?r.parent.getWorldQuaternion(t):t.identity();return{pos:s,axis:o.applyQuaternion(a).normalize()}})}_addFacePlanes(){const e=yn*.88,t=new mr(e,e),i=(r,s,o,a,l,c)=>{if(!r)return;const u=new Pc({color:43775,transparent:!0,opacity:0,side:Un,depthTest:!1}),h=new At(t,u);h.rotation.y=c,h.position.set(o,a,l),h.userData={type:"face",faceKey:s},h.renderOrder=999,h.visible=!1,r.add(h),this._facePlaneMeshes.push(h)};i(this._rodMeshes.R1,"R1_outer",0,0,0,-Math.PI/2),i(this._rodMeshes.R7,"R7_outer",yn,0,0,+Math.PI/2),i(this._r3CuboidMesh,"R3_cuboid_plusZ",0,0,yn,0),i(this._r3CuboidMesh,"R3_cuboid_minusZ",0,0,-yn,Math.PI)}showFaceIndicators(e){this._facesVisible=e;for(const t of this._facePlaneMeshes)t.visible=e,t.material.opacity=e?.35:0,t.material.needsUpdate=!0}resetFaceHighlights(){for(const e of this._facePlaneMeshes)e.material.color.setHex(43775),e.material.opacity=this._facesVisible?.35:0,e.material.needsUpdate=!0}setFaceHighlight(e,t){const i={normal:{hex:43775,op:.35},selected1:{hex:65416,op:.75},selected2:{hex:16755200,op:.75},error:{hex:16720384,op:.8}}[t]??{hex:43775,op:.35};for(const r of this._facePlaneMeshes)r.userData.faceKey===e&&(r.material.color.setHex(i.hex),r.material.opacity=i.op,r.material.needsUpdate=!0)}getFaceIndicatorMeshes(){return this._facePlaneMeshes}getLinkBounds(){this.robotGroup.updateMatrixWorld(!0);const e={};for(const[t,i]of Object.entries(this._rodMeshes)){i.geometry.boundingBox||i.geometry.computeBoundingBox();const r=i.geometry.boundingBox.clone();if(r.applyMatrix4(i.matrixWorld),t==="R3"&&this._r3CuboidMesh){this._r3CuboidMesh.geometry.boundingBox||this._r3CuboidMesh.geometry.computeBoundingBox();const s=this._r3CuboidMesh.geometry.boundingBox.clone();s.applyMatrix4(this._r3CuboidMesh.matrixWorld),r.union(s)}e[t]=r}return e}_makeTip(){const e=new Ot;return e.name="tip_marker",e}}const mg=new $_;class gC{constructor(e,t,i,r,s){this.canvas=e,this.camera=t,this.getInteractables=i,this.resolveModuleId=r,this.callbacks=s,this._mouseDownPos=new we,this._dragLastNDC=new we,this._hitId=null,this._hitModuleId=null,this._hoveredId=null,this._hoveredModuleId=null,this._dragging=!1,this.paused=!1,this._onMouseDown=this._onMouseDown.bind(this),this._onMouseMove=this._onMouseMove.bind(this),this._onMouseUp=this._onMouseUp.bind(this),this._onTouchStart=this._onTouchStart.bind(this),this._onTouchMove=this._onTouchMove.bind(this),this._onTouchEnd=this._onTouchEnd.bind(this),e.addEventListener("mousedown",this._onMouseDown),e.addEventListener("mousemove",this._onMouseMove),e.addEventListener("mouseup",this._onMouseUp),e.addEventListener("touchstart",this._onTouchStart,{passive:!1}),e.addEventListener("touchmove",this._onTouchMove,{passive:!1}),e.addEventListener("touchend",this._onTouchEnd)}_getNDC(e,t){const i=this.canvas.getBoundingClientRect();return new we((e-i.left)/i.width*2-1,-((t-i.top)/i.height)*2+1)}_raycastHit(e){var a;mg.setFromCamera(e,this.camera);const t=mg.intersectObjects(this.getInteractables(),!1);if(!t.length)return{rodId:null,moduleId:null};const i=t[0].object;let r=null,s=i;for(;s;){if((a=s.userData)!=null&&a.id){r=s.userData.id;break}s=s.parent}const o=this.resolveModuleId?this.resolveModuleId(i):null;return{rodId:r,moduleId:o}}_onMouseDown(e){if(e.button!==0||this.paused)return;const t=this._getNDC(e.clientX,e.clientY);this._mouseDownPos.copy(t),this._dragLastNDC.copy(t);const i=this._raycastHit(t);this._hitId=i.rodId,this._hitModuleId=i.moduleId,this._dragging=!1}_onMouseMove(e){var i,r,s,o,a,l,c,u;if(this.paused)return;const t=this._getNDC(e.clientX,e.clientY);if(this._hitId&&(!this._dragging&&t.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(r=(i=this.callbacks).onDragStart)==null||r.call(i,this._hitModuleId,this._hitId,t),this.canvas.style.cursor="grabbing"),this._dragging)){const h=t.x-this._dragLastNDC.x,p=t.y-this._dragLastNDC.y;(o=(s=this.callbacks).onDrag)==null||o.call(s,this._hitModuleId,this._hitId,h,p,t),this._dragLastNDC.copy(t);return}if(!this._dragging){const{rodId:h,moduleId:p}=this._raycastHit(t);(h!==this._hoveredId||p!==this._hoveredModuleId)&&(this._hoveredId&&((l=(a=this.callbacks).onHoverChange)==null||l.call(a,this._hoveredModuleId,this._hoveredId,!1)),this._hoveredId=h,this._hoveredModuleId=p,h?((u=(c=this.callbacks).onHoverChange)==null||u.call(c,p,h,!0),this.canvas.style.cursor="grab"):this.canvas.style.cursor="default")}}_onMouseUp(e){var t,i,r,s;e.button!==0||this.paused||(this._dragging?(this._dragging=!1,(i=(t=this.callbacks).onDragEnd)==null||i.call(t),this.canvas.style.cursor=this._hoveredId?"grab":"default"):this._getNDC(e.clientX,e.clientY).distanceTo(this._mouseDownPos)<.015&&this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitModuleId,this._hitId)),this._hitId=null,this._hitModuleId=null)}_onTouchStart(e){if(e.preventDefault(),e.touches.length!==1)return;const t=e.touches[0],i=this._getNDC(t.clientX,t.clientY);this._mouseDownPos.copy(i),this._dragLastNDC.copy(i);const r=this._raycastHit(i);this._hitId=r.rodId,this._hitModuleId=r.moduleId,this._dragging=!1}_onTouchMove(e){var r,s,o,a;if(!this._hitId||e.touches.length!==1)return;e.preventDefault();const t=e.touches[0],i=this._getNDC(t.clientX,t.clientY);if(!this._dragging&&i.distanceTo(this._mouseDownPos)>.015&&(this._dragging=!0,(s=(r=this.callbacks).onDragStart)==null||s.call(r,this._hitModuleId,this._hitId,i)),this._dragging){const l=i.x-this._dragLastNDC.x,c=i.y-this._dragLastNDC.y;(a=(o=this.callbacks).onDrag)==null||a.call(o,this._hitModuleId,this._hitId,l,c,i),this._dragLastNDC.copy(i)}}_onTouchEnd(e){var t,i,r,s;this._dragging?(this._dragging=!1,(i=(t=this.callbacks).onDragEnd)==null||i.call(t)):this._hitId&&((s=(r=this.callbacks).onRootClick)==null||s.call(r,this._hitModuleId,this._hitId)),this._hitId=null,this._hitModuleId=null}dispose(){this.canvas.removeEventListener("mousedown",this._onMouseDown),this.canvas.removeEventListener("mousemove",this._onMouseMove),this.canvas.removeEventListener("mouseup",this._onMouseUp),this.canvas.removeEventListener("touchstart",this._onTouchStart),this.canvas.removeEventListener("touchmove",this._onTouchMove),this.canvas.removeEventListener("touchend",this._onTouchEnd)}}const vC=10,_C=.06,xC=.04,yC=.25,ll=3,gg=15;class MC{constructor(e){this.numJoints=e,this.history=Array.from({length:e},()=>[]),this.smoothed=Array.from({length:e},()=>({angle:0,velocity:0,acceleration:0,limitHit:!1}))}update(e,t,i){for(let r=0;r<this.numJoints;r++){const s=this.history[r];s.push({angle:e[r],time:i}),s.length>vC&&s.shift();let o=0;if(s.length>=3){const c=s.length,u=(s[c-1].time-s[c-3].time)/1e3;u>.001&&(o=(s[c-1].angle-s[c-3].angle)/u)}else if(s.length>=2){const c=s.length,u=(s[c-1].time-s[c-2].time)/1e3;u>0&&(o=(s[c-1].angle-s[c-2].angle)/u)}o=Math.max(-ll,Math.min(ll,o));let a=0;if(s.length>=5){const c=s.length,u=(s[c-3].time-s[c-5].time)/1e3,h=(s[c-1].time-s[c-3].time)/1e3;if(u>.001&&h>.001){const p=(s[c-3].angle-s[c-5].angle)/u,f=Math.max(-ll,Math.min(ll,p));a=(o-f)/((u+h)*.5)}}a=Math.max(-gg,Math.min(gg,a));const l=this.smoothed[r];this.smoothed[r]={angle:Gu(e[r],l.angle,yC),velocity:Gu(o,l.velocity,_C),acceleration:Gu(a,l.acceleration,xC),limitHit:t[r]??!1}}return this.smoothed.map(r=>({...r}))}reset(){this.history.forEach(e=>e.splice(0)),this.smoothed.forEach(e=>{e.angle=0,e.velocity=0,e.acceleration=0})}seed(e){this.history.forEach(t=>t.splice(0));for(let t=0;t<this.numJoints;t++)this.smoothed[t]={angle:e[t]??0,velocity:0,acceleration:0,limitHit:!1}}}function Gu(n,e,t){return t*n+(1-t)*e}const Wu=new O;function vg(n,e,t,i){return Wu.set(n,e,t).project(i),{x:Wu.x,y:Wu.y}}const _g=.05,xg=.08;function q_(n,e,t,i,r,s,o,a,l,c=.008,u=.5){const h=t.length;if(h===0)return[...o];const p=vg(n.x,n.y,n.z,i);let f=r.x-s.x-p.x,g=r.y-s.y-p.y;const y=Math.sqrt(f*f+g*g);if(y<5e-4)return[...o];if(y>xg){const D=xg/y;f*=D,g*=D}const m=.006,d=new Float64Array(h*2);for(let D=0;D<h;D++){const B=t[D],{pos:L,axis:V}=e[B],j=n.x-L.x,Q=n.y-L.y,$=n.z-L.z,F=V.y*$-V.z*Q,H=V.z*j-V.x*$,W=V.x*Q-V.y*j,z=vg(n.x+F*m,n.y+H*m,n.z+W*m,i);d[D*2]=(z.x-p.x)/m,d[D*2+1]=(z.y-p.y)/m}let v=c,_=0,M=c;for(let D=0;D<h;D++){const B=d[D*2],L=d[D*2+1];v+=B*B,_+=B*L,M+=L*L}const T=v*M-_*_;if(Math.abs(T)<1e-14)return[...o];const b=f*u,E=g*u,P=(M*b-_*E)/T,A=(-_*b+v*E)/T,S=[...o];for(let D=0;D<h;D++){const B=t[D],V=a[B].type==="twist"?Math.PI:l,j=Math.max(-_g,Math.min(_g,d[D*2]*P+d[D*2+1]*A));S[B]=Math.max(-V,Math.min(V,o[B]+j))}return S}const SC=[gs.R2,gs.R3,gs.R4,gs.R5,gs.R6],Xu=yn*2+SC.reduce((n,e)=>n+e,0);class EC{constructor(e,t,i,r,s){this.scene=e,this.robotFK=t,this.interaction=i,this.getStore=r,this.act=s,this._telemetry=new MC(6),this._raf=null,this._lastRootId="R1",this._activeDragRodId=null,this._activeDragModuleId=null,this._activeDragNdc=new we,this._pickupOffset={x:0,y:0},this._homeAnim=null,this._connectMode=!1,this.extraTick=null,this.postTick=null,this.onInteractionEnd=null,this.activateModule=null,this.getActiveModuleId=null,this.crossModuleStep=null,this.crossModuleEnd=null,this._prevAngles=[0,0,0,0,0,0],this._wasColliding=!1,this.getOtherModuleBounds=null,oe.getArmNodes=()=>this.robotFK.getNodePositions().map(o=>({x:o.x,y:o.y,z:o.z})),this._setupInteractionCallbacks()}_ikDragNode(e,t){return e>t?Math.min(e,5):Math.max(e-1,0)}_activeJoints(e,t,i){const r=[];if(e>t)for(let s=t;s<i;s++)r.push(s);else for(let s=i+1;s<t;s++)r.push(s);return r}_setupInteractionCallbacks(){this.interaction.callbacks.onHoverChange=(e,t,i)=>{const r=this.getActiveModuleId?this.getActiveModuleId():null;r&&e&&e!==r||this.robotFK.setHoverHighlight(t,i)},this.interaction.callbacks.onRootClick=(e,t)=>{const i=this.getActiveModuleId?this.getActiveModuleId():null;e&&i&&e!==i&&this.activateModule&&this.activateModule(e);const r=this.getStore();if(t===r.activeRootId)return;const s=r.mode||"horizontal",{newAngles:o,rootPos:a,rootQuat:l}=this.robotFK.computeAnglesForRoot(t,s);this.act.setRootAndAngles(t,o),this._lastRootId=t,this.robotFK.rebuild(t,o,a,l),this._telemetry.seed(o)},this.interaction.callbacks.onDragStart=(e,t,i)=>{this.scene.setOrbitEnabled(!1),this._homeAnim=null,i&&this._activeDragNdc.set(i.x,i.y);const r=this.getActiveModuleId?this.getActiveModuleId():null;if(e&&r&&e!==r){if((this.isInActiveAssembly?this.isInActiveAssembly(e):!1)&&this.crossModuleStep){this._activeDragRodId=t,this._activeDragModuleId=e,this.crossModuleStep(e,t,this._activeDragNdc,this.getStore().mode||"horizontal",!0);return}this.activateModule&&this.activateModule(e)}this._activeDragModuleId=null;const s=this.getStore(),o=Zn.indexOf(s.activeRootId),a=Zn.indexOf(t),l=this._ikDragNode(a,o),u=this.robotFK.getNodePositions()[l],h=new O(u.x,u.y,u.z).project(this.scene.camera);this._pickupOffset=i?{x:i.x-h.x,y:i.y-h.y}:{x:0,y:0},this._activeDragRodId=t},this.interaction.callbacks.onDrag=(e,t,i,r,s)=>{s&&this._activeDragNdc.set(s.x,s.y)},this.interaction.callbacks.onDragEnd=()=>{this._activeDragModuleId&&this.crossModuleEnd&&this.crossModuleEnd(),this._activeDragRodId=null,this._activeDragModuleId=null,this.scene.setOrbitEnabled(!0),this.onInteractionEnd&&this.onInteractionEnd()}}_runIKStep(e,t){const i=this.getStore(),r=i.mode||"horizontal",s=Zn.indexOf(i.activeRootId),o=Zn.indexOf(e);if(o===s)return;const a=this._ikDragNode(o,s),l=this._activeJoints(o,s,a);if(l.length===0)return;const u=this.robotFK.getNodePositions()[a],h=new O(u.x,u.y,u.z),p=this.robotFK.getJointWorldData(r);return q_(h,p,l,this.scene.camera,{x:t.x,y:t.y},this._pickupOffset,i.jointAngles,yt,Go,.008,.5)}swapRobotFK(e){this.robotFK=e}setConnectMode(e){this._connectMode=e}cancelMotion(){this._homeAnim=null,this._activeDragRodId=null,this._activeDragModuleId=null,this.scene.setOrbitEnabled(!0),this.act.clearPendingHome&&this.act.clearPendingHome()}start(){const e=t=>{this._raf=requestAnimationFrame(e),this._frame(t)};this._raf=requestAnimationFrame(e)}stop(){this._raf&&cancelAnimationFrame(this._raf)}_frame(e){const t=this.getStore(),i=t.mode||"horizontal";if(this.extraTick&&this.extraTick(),t.pendingHome&&!this._connectMode){this.act.clearPendingHome(),this._activeDragRodId=null;let m=[...t.jointAngles];if(t.activeRootId!=="R1"){const{newAngles:_,rootPos:M,rootQuat:T}=this.robotFK.computeAnglesForRoot("R1",i);this.act.setRootAndAngles("R1",_),this._lastRootId="R1",this.robotFK.rebuild("R1",_,M,T),this._telemetry.seed(_),m=_}const d=Math.max(.01,...m.map(_=>Math.abs(_))),v=Math.max(1500,600+d*(2200/Math.PI));this._homeAnim={startAngles:m,startTime:e,duration:v}}if(this._homeAnim){const{startAngles:m,startTime:d,duration:v}=this._homeAnim,_=Math.min((e-d)/v,1),M=_<.5?4*_*_*_:1-Math.pow(-2*_+2,3)/2,T=m.map(L=>L*(1-M));for(let L=0;L<6;L++)this.act.setJointAngle(L,T[L]);this.robotFK.updateAngles(T,i);const b=T.map((L,V)=>Math.abs(L)>=yt[V].limit-.01),E=this._telemetry.update(T,b,e);this.act.setJointTelemetry(E);for(let L=0;L<yt.length;L++)this.robotFK.setLimitHighlight(yt[L].id,b[L]);const P=this.robotFK.getEndEffectorWorld(),A=this.robotFK.robotGroup.position,S=P.x-A.x,D=P.y-A.y,B=P.z-A.z;if(this.act.updateEndEffector(P,Math.min(Math.sqrt(S*S+D*D+B*B)/Xu,1)*100),this.postTick&&this.postTick(),this.scene.render(),_>=1){this._homeAnim=null;for(let L=0;L<6;L++)this.act.setJointAngle(L,0);this.robotFK.updateAngles([0,0,0,0,0,0],i),this._telemetry.seed([0,0,0,0,0,0]),oe.fitCamera&&oe.fitCamera()}return}let r=t.jointAngles;if(t.activeRootId!==this._lastRootId){const{newAngles:m,rootPos:d,rootQuat:v}=this.robotFK.computeAnglesForRoot(t.activeRootId,i);this.act.setRootAndAngles(t.activeRootId,m),this._lastRootId=t.activeRootId,this.robotFK.rebuild(t.activeRootId,m,d,v),this._telemetry.seed(m),r=m,this._prevAngles=[...m]}if(this._activeDragRodId&&this._activeDragModuleId&&!this._connectMode&&this.crossModuleStep){this.crossModuleStep(this._activeDragModuleId,this._activeDragRodId,this._activeDragNdc,i,!1),r=this.getStore().jointAngles,this.robotFK.updateAngles(r,i);const m=r.map((E,P)=>Math.abs(E)>=yt[P].limit-.01),d=this._telemetry.update(r,m,e);this.act.setJointTelemetry(d);for(let E=0;E<yt.length;E++)this.robotFK.setLimitHighlight(yt[E].id,m[E]);const v=this.robotFK.getEndEffectorWorld(),_=this.robotFK.robotGroup.position,M=v.x-_.x,T=v.y-_.y,b=v.z-_.z;this.act.updateEndEffector(v,Math.min(Math.sqrt(M*M+T*T+b*b)/Xu,1)*100),this.postTick&&this.postTick(),this.scene.render();return}let s=[...r],o=!1;if(this._activeDragRodId&&!this._connectMode){const m=this._runIKStep(this._activeDragRodId,this._activeDragNdc);m&&(s=m,o=!0)}this.robotFK.updateAngles(s,i);{let m=!1;if(this.getOtherModuleBounds&&!m){const d=new Dn().setFromObject(this.robotFK.robotGroup);for(const v of this.getOtherModuleBounds())if(d.clone().expandByScalar(-.05).intersectsBox(v.clone().expandByScalar(-.05))){m=!0;break}}if(!m){const d=["R1","R2","R3","R4","R5","R6","R7"],v=this.robotFK.getLinkBounds();e:for(let _=0;_<d.length;_++)for(let M=_+3;M<d.length;M++){const T=v[d[_]],b=v[d[M]];if(T&&b&&T.clone().expandByScalar(-.02).intersectsBox(b.clone().expandByScalar(-.02))){m=!0;break e}}}if(m)this.robotFK.updateAngles(this._prevAngles,i),r=this._prevAngles,this._wasColliding||this.act.setAllAngles(this._prevAngles);else{if(o){for(let d=0;d<6;d++)this.act.setJointAngle(d,s[d]);r=s}this._prevAngles=[...r]}this._wasColliding=m,this.act.setCollision(m)}const a=r.map((m,d)=>Math.abs(m)>=yt[d].limit-.01),l=this._telemetry.update(r,a,e);this.act.setJointTelemetry(l);for(let m=0;m<yt.length;m++)this.robotFK.setLimitHighlight(yt[m].id,a[m]);const c=this.robotFK.getEndEffectorWorld(),u=this.robotFK.robotGroup.position,h=c.x-u.x,p=c.y-u.y,f=c.z-u.z,g=Math.sqrt(h*h+p*p+f*f),y=Math.min(g/Xu,1)*100;this.act.updateEndEffector(c,y),this.postTick&&this.postTick(),this.scene.render()}}const K_="tetrobot:theme",wC=(()=>{try{return localStorage.getItem(K_)==="dark"?"dark":"light"}catch{return"light"}})(),gr=ro((n,e)=>({theme:wC,setTheme(t){try{localStorage.setItem(K_,t)}catch{}n({theme:t})},toggleTheme(){e().setTheme(e().theme==="dark"?"light":"dark")}}));let wo,$u,ps,cl;function Yu(n,e=1/0,t=null){$u||($u=new mr(2,2,1,1)),ps||(ps=new Vt({uniforms:{blitTexture:new ph(n)},vertexShader:`
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
			}`})),ps.uniforms.blitTexture.value=n,ps.defines.IS_SRGB=n.colorSpace==_n,ps.needsUpdate=!0,cl||(cl=new At($u,ps),cl.frustumCulled=!1);const i=new xn,r=new ac;r.add(cl),t===null&&(t=wo=new W_({antialias:!1}));const s=Math.min(n.image.width,e),o=Math.min(n.image.height,e);t.setSize(s,o),t.clear(),t.render(r,i);const a=document.createElement("canvas"),l=a.getContext("2d");a.width=s,a.height=o,l.drawImage(t.domElement,0,0,s,o);const c=new Fb(a);return c.minFilter=n.minFilter,c.magFilter=n.magFilter,c.wrapS=n.wrapS,c.wrapT=n.wrapT,c.name=n.name,wo&&(wo.forceContextLoss(),wo.dispose(),wo=null),c}const yg={POSITION:["byte","byte normalized","unsigned byte","unsigned byte normalized","short","short normalized","unsigned short","unsigned short normalized"],NORMAL:["byte normalized","short normalized"],TANGENT:["byte normalized","short normalized"],TEXCOORD:["byte","byte normalized","unsigned byte","short","short normalized","unsigned short"]};class gh{constructor(){this.pluginCallbacks=[],this.register(function(e){return new DC(e)}),this.register(function(e){return new UC(e)}),this.register(function(e){return new zC(e)}),this.register(function(e){return new BC(e)}),this.register(function(e){return new HC(e)}),this.register(function(e){return new VC(e)}),this.register(function(e){return new FC(e)}),this.register(function(e){return new OC(e)}),this.register(function(e){return new kC(e)}),this.register(function(e){return new jC(e)}),this.register(function(e){return new GC(e)}),this.register(function(e){return new WC(e)}),this.register(function(e){return new XC(e)}),this.register(function(e){return new $C(e)})}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,i,r){const s=new IC,o=[];for(let a=0,l=this.pluginCallbacks.length;a<l;a++)o.push(this.pluginCallbacks[a](s));s.setPlugins(o),s.write(e,t,r).catch(i)}parseAsync(e,t){const i=this;return new Promise(function(r,s){i.parse(e,r,s,t)})}}const qe={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,BYTE:5120,UNSIGNED_BYTE:5121,SHORT:5122,UNSIGNED_SHORT:5123,INT:5124,UNSIGNED_INT:5125,FLOAT:5126,ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,NEAREST:9728,LINEAR:9729,NEAREST_MIPMAP_NEAREST:9984,LINEAR_MIPMAP_NEAREST:9985,NEAREST_MIPMAP_LINEAR:9986,LINEAR_MIPMAP_LINEAR:9987,CLAMP_TO_EDGE:33071,MIRRORED_REPEAT:33648,REPEAT:10497},qu="KHR_mesh_quantization",En={};En[Sn]=qe.NEAREST;En[y_]=qe.NEAREST_MIPMAP_NEAREST;En[Lo]=qe.NEAREST_MIPMAP_LINEAR;En[Fn]=qe.LINEAR;En[Tl]=qe.LINEAR_MIPMAP_NEAREST;En[Qi]=qe.LINEAR_MIPMAP_LINEAR;En[Ji]=qe.CLAMP_TO_EDGE;En[ec]=qe.REPEAT;En[tc]=qe.MIRRORED_REPEAT;const Mg={scale:"scale",position:"translation",quaternion:"rotation",morphTargetInfluences:"weights"},TC=new He,Sg=12,AC=1179937895,bC=2,Eg=8,CC=1313821514,RC=5130562;function Do(n,e){return n.length===e.length&&n.every(function(t,i){return t===e[i]})}function PC(n){return new TextEncoder().encode(n).buffer}function NC(n){return Do(n.elements,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function LC(n,e,t){const i={min:new Array(n.itemSize).fill(Number.POSITIVE_INFINITY),max:new Array(n.itemSize).fill(Number.NEGATIVE_INFINITY)};for(let r=e;r<e+t;r++)for(let s=0;s<n.itemSize;s++){let o;n.itemSize>4?o=n.array[r*n.itemSize+s]:(s===0?o=n.getX(r):s===1?o=n.getY(r):s===2?o=n.getZ(r):s===3&&(o=n.getW(r)),n.normalized===!0&&(o=Js.normalize(o,n.array))),i.min[s]=Math.min(i.min[s],o),i.max[s]=Math.max(i.max[s],o)}return i}function Z_(n){return Math.ceil(n/4)*4}function Ku(n,e=0){const t=Z_(n.byteLength);if(t!==n.byteLength){const i=new Uint8Array(t);if(i.set(new Uint8Array(n)),e!==0)for(let r=n.byteLength;r<t;r++)i[r]=e;return i.buffer}return n}function wg(){return typeof document>"u"&&typeof OffscreenCanvas<"u"?new OffscreenCanvas(1,1):document.createElement("canvas")}function Tg(n,e){if(n.toBlob!==void 0)return new Promise(i=>n.toBlob(i,e));let t;return e==="image/jpeg"?t=.92:e==="image/webp"&&(t=.8),n.convertToBlob({type:e,quality:t})}class IC{constructor(){this.plugins=[],this.options={},this.pending=[],this.buffers=[],this.byteOffset=0,this.buffers=[],this.nodeMap=new Map,this.skins=[],this.extensionsUsed={},this.extensionsRequired={},this.uids=new Map,this.uid=0,this.json={asset:{version:"2.0",generator:"THREE.GLTFExporter r"+bc}},this.cache={meshes:new Map,attributes:new Map,attributesNormalized:new Map,materials:new Map,textures:new Map,images:new Map}}setPlugins(e){this.plugins=e}async write(e,t,i={}){this.options=Object.assign({binary:!1,trs:!1,onlyVisible:!0,maxTextureSize:1/0,animations:[],includeCustomExtensions:!1},i),this.options.animations.length>0&&(this.options.trs=!0),this.processInput(e),await Promise.all(this.pending);const r=this,s=r.buffers,o=r.json;i=r.options;const a=r.extensionsUsed,l=r.extensionsRequired,c=new Blob(s,{type:"application/octet-stream"}),u=Object.keys(a),h=Object.keys(l);if(u.length>0&&(o.extensionsUsed=u),h.length>0&&(o.extensionsRequired=h),o.buffers&&o.buffers.length>0&&(o.buffers[0].byteLength=c.size),i.binary===!0){const p=new FileReader;p.readAsArrayBuffer(c),p.onloadend=function(){const f=Ku(p.result),g=new DataView(new ArrayBuffer(Eg));g.setUint32(0,f.byteLength,!0),g.setUint32(4,RC,!0);const y=Ku(PC(JSON.stringify(o)),32),m=new DataView(new ArrayBuffer(Eg));m.setUint32(0,y.byteLength,!0),m.setUint32(4,CC,!0);const d=new ArrayBuffer(Sg),v=new DataView(d);v.setUint32(0,AC,!0),v.setUint32(4,bC,!0);const _=Sg+m.byteLength+y.byteLength+g.byteLength+f.byteLength;v.setUint32(8,_,!0);const M=new Blob([d,m,y,g,f],{type:"application/octet-stream"}),T=new FileReader;T.readAsArrayBuffer(M),T.onloadend=function(){t(T.result)}}}else if(o.buffers&&o.buffers.length>0){const p=new FileReader;p.readAsDataURL(c),p.onloadend=function(){const f=p.result;o.buffers[0].uri=f,t(o)}}else t(o)}serializeUserData(e,t){if(Object.keys(e.userData).length===0)return;const i=this.options,r=this.extensionsUsed;try{const s=JSON.parse(JSON.stringify(e.userData));if(i.includeCustomExtensions&&s.gltfExtensions){t.extensions===void 0&&(t.extensions={});for(const o in s.gltfExtensions)t.extensions[o]=s.gltfExtensions[o],r[o]=!0;delete s.gltfExtensions}Object.keys(s).length>0&&(t.extras=s)}catch(s){console.warn("THREE.GLTFExporter: userData of '"+e.name+"' won't be serialized because of JSON.stringify error - "+s.message)}}getUID(e,t=!1){if(this.uids.has(e)===!1){const r=new Map;r.set(!0,this.uid++),r.set(!1,this.uid++),this.uids.set(e,r)}return this.uids.get(e).get(t)}isNormalizedNormalAttribute(e){if(this.cache.attributesNormalized.has(e))return!1;const i=new O;for(let r=0,s=e.count;r<s;r++)if(Math.abs(i.fromBufferAttribute(e,r).length()-1)>5e-4)return!1;return!0}createNormalizedNormalAttribute(e){const t=this.cache;if(t.attributesNormalized.has(e))return t.attributesNormalized.get(e);const i=e.clone(),r=new O;for(let s=0,o=i.count;s<o;s++)r.fromBufferAttribute(i,s),r.x===0&&r.y===0&&r.z===0?r.setX(1):r.normalize(),i.setXYZ(s,r.x,r.y,r.z);return t.attributesNormalized.set(e,i),i}applyTextureTransform(e,t){let i=!1;const r={};(t.offset.x!==0||t.offset.y!==0)&&(r.offset=t.offset.toArray(),i=!0),t.rotation!==0&&(r.rotation=t.rotation,i=!0),(t.repeat.x!==1||t.repeat.y!==1)&&(r.scale=t.repeat.toArray(),i=!0),i&&(e.extensions=e.extensions||{},e.extensions.KHR_texture_transform=r,this.extensionsUsed.KHR_texture_transform=!0)}buildMetalRoughTexture(e,t){if(e===t)return e;function i(f){return f.colorSpace===_n?function(y){return y<.04045?y*.0773993808:Math.pow(y*.9478672986+.0521327014,2.4)}:function(y){return y}}console.warn("THREE.GLTFExporter: Merged metalnessMap and roughnessMap textures."),e instanceof zu&&(e=Yu(e)),t instanceof zu&&(t=Yu(t));const r=e?e.image:null,s=t?t.image:null,o=Math.max(r?r.width:0,s?s.width:0),a=Math.max(r?r.height:0,s?s.height:0),l=wg();l.width=o,l.height=a;const c=l.getContext("2d");c.fillStyle="#00ffff",c.fillRect(0,0,o,a);const u=c.getImageData(0,0,o,a);if(r){c.drawImage(r,0,0,o,a);const f=i(e),g=c.getImageData(0,0,o,a).data;for(let y=2;y<g.length;y+=4)u.data[y]=f(g[y]/256)*256}if(s){c.drawImage(s,0,0,o,a);const f=i(t),g=c.getImageData(0,0,o,a).data;for(let y=1;y<g.length;y+=4)u.data[y]=f(g[y]/256)*256}c.putImageData(u,0,0);const p=(e||t).clone();return p.source=new ih(l),p.colorSpace=Ei,p.channel=(e||t).channel,e&&t&&e.channel!==t.channel&&console.warn("THREE.GLTFExporter: UV channels for metalnessMap and roughnessMap textures must match."),p}processBuffer(e){const t=this.json,i=this.buffers;return t.buffers||(t.buffers=[{byteLength:0}]),i.push(e),0}processBufferView(e,t,i,r,s){const o=this.json;o.bufferViews||(o.bufferViews=[]);let a;switch(t){case qe.BYTE:case qe.UNSIGNED_BYTE:a=1;break;case qe.SHORT:case qe.UNSIGNED_SHORT:a=2;break;default:a=4}let l=e.itemSize*a;s===qe.ARRAY_BUFFER&&(l=Math.ceil(l/4)*4);const c=Z_(r*l),u=new DataView(new ArrayBuffer(c));let h=0;for(let g=i;g<i+r;g++){for(let y=0;y<e.itemSize;y++){let m;e.itemSize>4?m=e.array[g*e.itemSize+y]:(y===0?m=e.getX(g):y===1?m=e.getY(g):y===2?m=e.getZ(g):y===3&&(m=e.getW(g)),e.normalized===!0&&(m=Js.normalize(m,e.array))),t===qe.FLOAT?u.setFloat32(h,m,!0):t===qe.INT?u.setInt32(h,m,!0):t===qe.UNSIGNED_INT?u.setUint32(h,m,!0):t===qe.SHORT?u.setInt16(h,m,!0):t===qe.UNSIGNED_SHORT?u.setUint16(h,m,!0):t===qe.BYTE?u.setInt8(h,m):t===qe.UNSIGNED_BYTE&&u.setUint8(h,m),h+=a}h%l!==0&&(h+=l-h%l)}const p={buffer:this.processBuffer(u.buffer),byteOffset:this.byteOffset,byteLength:c};return s!==void 0&&(p.target=s),s===qe.ARRAY_BUFFER&&(p.byteStride=l),this.byteOffset+=c,o.bufferViews.push(p),{id:o.bufferViews.length-1,byteLength:0}}processBufferViewImage(e){const t=this,i=t.json;return i.bufferViews||(i.bufferViews=[]),new Promise(function(r){const s=new FileReader;s.readAsArrayBuffer(e),s.onloadend=function(){const o=Ku(s.result),a={buffer:t.processBuffer(o),byteOffset:t.byteOffset,byteLength:o.byteLength};t.byteOffset+=o.byteLength,r(i.bufferViews.push(a)-1)}})}processAccessor(e,t,i,r){const s=this.json,o={1:"SCALAR",2:"VEC2",3:"VEC3",4:"VEC4",9:"MAT3",16:"MAT4"};let a;if(e.array.constructor===Float32Array)a=qe.FLOAT;else if(e.array.constructor===Int32Array)a=qe.INT;else if(e.array.constructor===Uint32Array)a=qe.UNSIGNED_INT;else if(e.array.constructor===Int16Array)a=qe.SHORT;else if(e.array.constructor===Uint16Array)a=qe.UNSIGNED_SHORT;else if(e.array.constructor===Int8Array)a=qe.BYTE;else if(e.array.constructor===Uint8Array)a=qe.UNSIGNED_BYTE;else throw new Error("THREE.GLTFExporter: Unsupported bufferAttribute component type: "+e.array.constructor.name);if(i===void 0&&(i=0),(r===void 0||r===1/0)&&(r=e.count),r===0)return null;const l=LC(e,i,r);let c;t!==void 0&&(c=e===t.index?qe.ELEMENT_ARRAY_BUFFER:qe.ARRAY_BUFFER);const u=this.processBufferView(e,a,i,r,c),h={bufferView:u.id,byteOffset:u.byteOffset,componentType:a,count:r,max:l.max,min:l.min,type:o[e.itemSize]};return e.normalized===!0&&(h.normalized=!0),s.accessors||(s.accessors=[]),s.accessors.push(h)-1}processImage(e,t,i,r="image/png"){if(e!==null){const s=this,o=s.cache,a=s.json,l=s.options,c=s.pending;o.images.has(e)||o.images.set(e,{});const u=o.images.get(e),h=r+":flipY/"+i.toString();if(u[h]!==void 0)return u[h];a.images||(a.images=[]);const p={mimeType:r},f=wg();f.width=Math.min(e.width,l.maxTextureSize),f.height=Math.min(e.height,l.maxTextureSize);const g=f.getContext("2d");if(i===!0&&(g.translate(0,f.height),g.scale(1,-1)),e.data!==void 0){t!==Jn&&console.error("GLTFExporter: Only RGBAFormat is supported.",t),(e.width>l.maxTextureSize||e.height>l.maxTextureSize)&&console.warn("GLTFExporter: Image size is bigger than maxTextureSize",e);const m=new Uint8ClampedArray(e.height*e.width*4);for(let d=0;d<m.length;d+=4)m[d+0]=e.data[d+0],m[d+1]=e.data[d+1],m[d+2]=e.data[d+2],m[d+3]=e.data[d+3];g.putImageData(new ImageData(m,e.width,e.height),0,0)}else if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap||typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas)g.drawImage(e,0,0,f.width,f.height);else throw new Error("THREE.GLTFExporter: Invalid image type. Use HTMLImageElement, HTMLCanvasElement, ImageBitmap or OffscreenCanvas.");l.binary===!0?c.push(Tg(f,r).then(m=>s.processBufferViewImage(m)).then(m=>{p.bufferView=m})):f.toDataURL!==void 0?p.uri=f.toDataURL(r):c.push(Tg(f,r).then(m=>new FileReader().readAsDataURL(m)).then(m=>{p.uri=m}));const y=a.images.push(p)-1;return u[h]=y,y}else throw new Error("THREE.GLTFExporter: No valid image data found. Unable to process texture.")}processSampler(e){const t=this.json;t.samplers||(t.samplers=[]);const i={magFilter:En[e.magFilter],minFilter:En[e.minFilter],wrapS:En[e.wrapS],wrapT:En[e.wrapT]};return t.samplers.push(i)-1}processTexture(e){const i=this.options,r=this.cache,s=this.json;if(r.textures.has(e))return r.textures.get(e);s.textures||(s.textures=[]),e instanceof zu&&(e=Yu(e,i.maxTextureSize));let o=e.userData.mimeType;o==="image/webp"&&(o="image/png");const a={sampler:this.processSampler(e),source:this.processImage(e.image,e.format,e.flipY,o)};e.name&&(a.name=e.name),this._invokeAll(function(c){c.writeTexture&&c.writeTexture(e,a)});const l=s.textures.push(a)-1;return r.textures.set(e,l),l}processMaterial(e){const t=this.cache,i=this.json;if(t.materials.has(e))return t.materials.get(e);if(e.isShaderMaterial)return console.warn("GLTFExporter: THREE.ShaderMaterial not supported."),null;i.materials||(i.materials=[]);const r={pbrMetallicRoughness:{}};e.isMeshStandardMaterial!==!0&&e.isMeshBasicMaterial!==!0&&console.warn("GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.");const s=e.color.toArray().concat([e.opacity]);if(Do(s,[1,1,1,1])||(r.pbrMetallicRoughness.baseColorFactor=s),e.isMeshStandardMaterial?(r.pbrMetallicRoughness.metallicFactor=e.metalness,r.pbrMetallicRoughness.roughnessFactor=e.roughness):(r.pbrMetallicRoughness.metallicFactor=.5,r.pbrMetallicRoughness.roughnessFactor=.5),e.metalnessMap||e.roughnessMap){const a=this.buildMetalRoughTexture(e.metalnessMap,e.roughnessMap),l={index:this.processTexture(a),channel:a.channel};this.applyTextureTransform(l,a),r.pbrMetallicRoughness.metallicRoughnessTexture=l}if(e.map){const a={index:this.processTexture(e.map),texCoord:e.map.channel};this.applyTextureTransform(a,e.map),r.pbrMetallicRoughness.baseColorTexture=a}if(e.emissive){const a=e.emissive;if(Math.max(a.r,a.g,a.b)>0&&(r.emissiveFactor=e.emissive.toArray()),e.emissiveMap){const c={index:this.processTexture(e.emissiveMap),texCoord:e.emissiveMap.channel};this.applyTextureTransform(c,e.emissiveMap),r.emissiveTexture=c}}if(e.normalMap){const a={index:this.processTexture(e.normalMap),texCoord:e.normalMap.channel};e.normalScale&&e.normalScale.x!==1&&(a.scale=e.normalScale.x),this.applyTextureTransform(a,e.normalMap),r.normalTexture=a}if(e.aoMap){const a={index:this.processTexture(e.aoMap),texCoord:e.aoMap.channel};e.aoMapIntensity!==1&&(a.strength=e.aoMapIntensity),this.applyTextureTransform(a,e.aoMap),r.occlusionTexture=a}e.transparent?r.alphaMode="BLEND":e.alphaTest>0&&(r.alphaMode="MASK",r.alphaCutoff=e.alphaTest),e.side===Un&&(r.doubleSided=!0),e.name!==""&&(r.name=e.name),this.serializeUserData(e,r),this._invokeAll(function(a){a.writeMaterial&&a.writeMaterial(e,r)});const o=i.materials.push(r)-1;return t.materials.set(e,o),o}processMesh(e){const t=this.cache,i=this.json,r=[e.geometry.uuid];if(Array.isArray(e.material))for(let M=0,T=e.material.length;M<T;M++)r.push(e.material[M].uuid);else r.push(e.material.uuid);const s=r.join(":");if(t.meshes.has(s))return t.meshes.get(s);const o=e.geometry;let a;e.isLineSegments?a=qe.LINES:e.isLineLoop?a=qe.LINE_LOOP:e.isLine?a=qe.LINE_STRIP:e.isPoints?a=qe.POINTS:a=e.material.wireframe?qe.LINES:qe.TRIANGLES;const l={},c={},u=[],h=[],p={uv:"TEXCOORD_0",uv1:"TEXCOORD_1",uv2:"TEXCOORD_2",uv3:"TEXCOORD_3",color:"COLOR_0",skinWeight:"WEIGHTS_0",skinIndex:"JOINTS_0"},f=o.getAttribute("normal");f!==void 0&&!this.isNormalizedNormalAttribute(f)&&(console.warn("THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one."),o.setAttribute("normal",this.createNormalizedNormalAttribute(f)));let g=null;for(let M in o.attributes){if(M.slice(0,5)==="morph")continue;const T=o.attributes[M];if(M=p[M]||M.toUpperCase(),/^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/.test(M)||(M="_"+M),t.attributes.has(this.getUID(T))){c[M]=t.attributes.get(this.getUID(T));continue}g=null;const E=T.array;M==="JOINTS_0"&&!(E instanceof Uint16Array)&&!(E instanceof Uint8Array)&&(console.warn('GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.'),g=new Ht(new Uint16Array(E),T.itemSize,T.normalized));const P=this.processAccessor(g||T,o);P!==null&&(M.startsWith("_")||this.detectMeshQuantization(M,T),c[M]=P,t.attributes.set(this.getUID(T),P))}if(f!==void 0&&o.setAttribute("normal",f),Object.keys(c).length===0)return null;if(e.morphTargetInfluences!==void 0&&e.morphTargetInfluences.length>0){const M=[],T=[],b={};if(e.morphTargetDictionary!==void 0)for(const E in e.morphTargetDictionary)b[e.morphTargetDictionary[E]]=E;for(let E=0;E<e.morphTargetInfluences.length;++E){const P={};let A=!1;for(const S in o.morphAttributes){if(S!=="position"&&S!=="normal"){A||(console.warn("GLTFExporter: Only POSITION and NORMAL morph are supported."),A=!0);continue}const D=o.morphAttributes[S][E],B=S.toUpperCase(),L=o.attributes[S];if(t.attributes.has(this.getUID(D,!0))){P[B]=t.attributes.get(this.getUID(D,!0));continue}const V=D.clone();if(!o.morphTargetsRelative)for(let j=0,Q=D.count;j<Q;j++)for(let $=0;$<D.itemSize;$++)$===0&&V.setX(j,D.getX(j)-L.getX(j)),$===1&&V.setY(j,D.getY(j)-L.getY(j)),$===2&&V.setZ(j,D.getZ(j)-L.getZ(j)),$===3&&V.setW(j,D.getW(j)-L.getW(j));P[B]=this.processAccessor(V,o),t.attributes.set(this.getUID(L,!0),P[B])}h.push(P),M.push(e.morphTargetInfluences[E]),e.morphTargetDictionary!==void 0&&T.push(b[E])}l.weights=M,T.length>0&&(l.extras={},l.extras.targetNames=T)}const y=Array.isArray(e.material);if(y&&o.groups.length===0)return null;let m=!1;if(y&&o.index===null){const M=[];for(let T=0,b=o.attributes.position.count;T<b;T++)M[T]=T;o.setIndex(M),m=!0}const d=y?e.material:[e.material],v=y?o.groups:[{materialIndex:0,start:void 0,count:void 0}];for(let M=0,T=v.length;M<T;M++){const b={mode:a,attributes:c};if(this.serializeUserData(o,b),h.length>0&&(b.targets=h),o.index!==null){let P=this.getUID(o.index);(v[M].start!==void 0||v[M].count!==void 0)&&(P+=":"+v[M].start+":"+v[M].count),t.attributes.has(P)?b.indices=t.attributes.get(P):(b.indices=this.processAccessor(o.index,o,v[M].start,v[M].count),t.attributes.set(P,b.indices)),b.indices===null&&delete b.indices}const E=this.processMaterial(d[v[M].materialIndex]);E!==null&&(b.material=E),u.push(b)}m===!0&&o.setIndex(null),l.primitives=u,i.meshes||(i.meshes=[]),this._invokeAll(function(M){M.writeMesh&&M.writeMesh(e,l)});const _=i.meshes.push(l)-1;return t.meshes.set(s,_),_}detectMeshQuantization(e,t){if(this.extensionsUsed[qu])return;let i;switch(t.array.constructor){case Int8Array:i="byte";break;case Uint8Array:i="unsigned byte";break;case Int16Array:i="short";break;case Uint16Array:i="unsigned short";break;default:return}t.normalized&&(i+=" normalized");const r=e.split("_",1)[0];yg[r]&&yg[r].includes(i)&&(this.extensionsUsed[qu]=!0,this.extensionsRequired[qu]=!0)}processCamera(e){const t=this.json;t.cameras||(t.cameras=[]);const i=e.isOrthographicCamera,r={type:i?"orthographic":"perspective"};return i?r.orthographic={xmag:e.right*2,ymag:e.top*2,zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near}:r.perspective={aspectRatio:e.aspect,yfov:Js.degToRad(e.fov),zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near},e.name!==""&&(r.name=e.type),t.cameras.push(r)-1}processAnimation(e,t){const i=this.json,r=this.nodeMap;i.animations||(i.animations=[]),e=gh.Utils.mergeMorphTargetTracks(e.clone(),t);const s=e.tracks,o=[],a=[];for(let l=0;l<s.length;++l){const c=s[l],u=tt.parseTrackName(c.name);let h=tt.findNode(t,u.nodeName);const p=Mg[u.propertyName];if(u.objectName==="bones"&&(h.isSkinnedMesh===!0?h=h.skeleton.getBoneByName(u.objectIndex):h=void 0),!h||!p)return console.warn('THREE.GLTFExporter: Could not export animation track "%s".',c.name),null;const f=1;let g=c.values.length/c.times.length;p===Mg.morphTargetInfluences&&(g/=h.morphTargetInfluences.length);let y;c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline===!0?(y="CUBICSPLINE",g/=3):c.getInterpolation()===tE?y="STEP":y="LINEAR",a.push({input:this.processAccessor(new Ht(c.times,f)),output:this.processAccessor(new Ht(c.values,g)),interpolation:y}),o.push({sampler:a.length-1,target:{node:r.get(h),path:p}})}return i.animations.push({name:e.name||"clip_"+i.animations.length,samplers:a,channels:o}),i.animations.length-1}processSkin(e){const t=this.json,i=this.nodeMap,r=t.nodes[i.get(e)],s=e.skeleton;if(s===void 0)return null;const o=e.skeleton.bones[0];if(o===void 0)return null;const a=[],l=new Float32Array(s.bones.length*16),c=new Qe;for(let h=0;h<s.bones.length;++h)a.push(i.get(s.bones[h])),c.copy(s.boneInverses[h]),c.multiply(e.bindMatrix).toArray(l,h*16);return t.skins===void 0&&(t.skins=[]),t.skins.push({inverseBindMatrices:this.processAccessor(new Ht(l,16)),joints:a,skeleton:i.get(o)}),r.skin=t.skins.length-1}processNode(e){const t=this.json,i=this.options,r=this.nodeMap;t.nodes||(t.nodes=[]);const s={};if(i.trs){const a=e.quaternion.toArray(),l=e.position.toArray(),c=e.scale.toArray();Do(a,[0,0,0,1])||(s.rotation=a),Do(l,[0,0,0])||(s.translation=l),Do(c,[1,1,1])||(s.scale=c)}else e.matrixAutoUpdate&&e.updateMatrix(),NC(e.matrix)===!1&&(s.matrix=e.matrix.elements);if(e.name!==""&&(s.name=String(e.name)),this.serializeUserData(e,s),e.isMesh||e.isLine||e.isPoints){const a=this.processMesh(e);a!==null&&(s.mesh=a)}else e.isCamera&&(s.camera=this.processCamera(e));if(e.isSkinnedMesh&&this.skins.push(e),e.children.length>0){const a=[];for(let l=0,c=e.children.length;l<c;l++){const u=e.children[l];if(u.visible||i.onlyVisible===!1){const h=this.processNode(u);h!==null&&a.push(h)}}a.length>0&&(s.children=a)}this._invokeAll(function(a){a.writeNode&&a.writeNode(e,s)});const o=t.nodes.push(s)-1;return r.set(e,o),o}processScene(e){const t=this.json,i=this.options;t.scenes||(t.scenes=[],t.scene=0);const r={};e.name!==""&&(r.name=e.name),t.scenes.push(r);const s=[];for(let o=0,a=e.children.length;o<a;o++){const l=e.children[o];if(l.visible||i.onlyVisible===!1){const c=this.processNode(l);c!==null&&s.push(c)}}s.length>0&&(r.nodes=s),this.serializeUserData(e,r)}processObjects(e){const t=new ac;t.name="AuxScene";for(let i=0;i<e.length;i++)t.children.push(e[i]);this.processScene(t)}processInput(e){const t=this.options;e=e instanceof Array?e:[e],this._invokeAll(function(r){r.beforeParse&&r.beforeParse(e)});const i=[];for(let r=0;r<e.length;r++)e[r]instanceof ac?this.processScene(e[r]):i.push(e[r]);i.length>0&&this.processObjects(i);for(let r=0;r<this.skins.length;++r)this.processSkin(this.skins[r]);for(let r=0;r<t.animations.length;++r)this.processAnimation(t.animations[r],e[0]);this._invokeAll(function(r){r.afterParse&&r.afterParse(e)})}_invokeAll(e){for(let t=0,i=this.plugins.length;t<i;t++)e(this.plugins[t])}}class DC{constructor(e){this.writer=e,this.name="KHR_lights_punctual"}writeNode(e,t){if(!e.isLight)return;if(!e.isDirectionalLight&&!e.isPointLight&&!e.isSpotLight){console.warn("THREE.GLTFExporter: Only directional, point, and spot lights are supported.",e);return}const i=this.writer,r=i.json,s=i.extensionsUsed,o={};e.name&&(o.name=e.name),o.color=e.color.toArray(),o.intensity=e.intensity,e.isDirectionalLight?o.type="directional":e.isPointLight?(o.type="point",e.distance>0&&(o.range=e.distance)):e.isSpotLight&&(o.type="spot",e.distance>0&&(o.range=e.distance),o.spot={},o.spot.innerConeAngle=(1-e.penumbra)*e.angle,o.spot.outerConeAngle=e.angle),e.decay!==void 0&&e.decay!==2&&console.warn("THREE.GLTFExporter: Light decay may be lost. glTF is physically-based, and expects light.decay=2."),e.target&&(e.target.parent!==e||e.target.position.x!==0||e.target.position.y!==0||e.target.position.z!==-1)&&console.warn("THREE.GLTFExporter: Light direction may be lost. For best results, make light.target a child of the light with position 0,0,-1."),s[this.name]||(r.extensions=r.extensions||{},r.extensions[this.name]={lights:[]},s[this.name]=!0);const a=r.extensions[this.name].lights;a.push(o),t.extensions=t.extensions||{},t.extensions[this.name]={light:a.length-1}}}class UC{constructor(e){this.writer=e,this.name="KHR_materials_unlit"}writeMaterial(e,t){if(!e.isMeshBasicMaterial)return;const r=this.writer.extensionsUsed;t.extensions=t.extensions||{},t.extensions[this.name]={},r[this.name]=!0,t.pbrMetallicRoughness.metallicFactor=0,t.pbrMetallicRoughness.roughnessFactor=.9}}class FC{constructor(e){this.writer=e,this.name="KHR_materials_clearcoat"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.clearcoat===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.clearcoatFactor=e.clearcoat,e.clearcoatMap){const o={index:i.processTexture(e.clearcoatMap),texCoord:e.clearcoatMap.channel};i.applyTextureTransform(o,e.clearcoatMap),s.clearcoatTexture=o}if(s.clearcoatRoughnessFactor=e.clearcoatRoughness,e.clearcoatRoughnessMap){const o={index:i.processTexture(e.clearcoatRoughnessMap),texCoord:e.clearcoatRoughnessMap.channel};i.applyTextureTransform(o,e.clearcoatRoughnessMap),s.clearcoatRoughnessTexture=o}if(e.clearcoatNormalMap){const o={index:i.processTexture(e.clearcoatNormalMap),texCoord:e.clearcoatNormalMap.channel};e.clearcoatNormalScale.x!==1&&(o.scale=e.clearcoatNormalScale.x),i.applyTextureTransform(o,e.clearcoatNormalMap),s.clearcoatNormalTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class OC{constructor(e){this.writer=e,this.name="KHR_materials_dispersion"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.dispersion===0)return;const r=this.writer.extensionsUsed,s={};s.dispersion=e.dispersion,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class kC{constructor(e){this.writer=e,this.name="KHR_materials_iridescence"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.iridescence===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.iridescenceFactor=e.iridescence,e.iridescenceMap){const o={index:i.processTexture(e.iridescenceMap),texCoord:e.iridescenceMap.channel};i.applyTextureTransform(o,e.iridescenceMap),s.iridescenceTexture=o}if(s.iridescenceIor=e.iridescenceIOR,s.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],s.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1],e.iridescenceThicknessMap){const o={index:i.processTexture(e.iridescenceThicknessMap),texCoord:e.iridescenceThicknessMap.channel};i.applyTextureTransform(o,e.iridescenceThicknessMap),s.iridescenceThicknessTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class zC{constructor(e){this.writer=e,this.name="KHR_materials_transmission"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.transmissionFactor=e.transmission,e.transmissionMap){const o={index:i.processTexture(e.transmissionMap),texCoord:e.transmissionMap.channel};i.applyTextureTransform(o,e.transmissionMap),s.transmissionTexture=o}t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class BC{constructor(e){this.writer=e,this.name="KHR_materials_volume"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;const i=this.writer,r=i.extensionsUsed,s={};if(s.thicknessFactor=e.thickness,e.thicknessMap){const o={index:i.processTexture(e.thicknessMap),texCoord:e.thicknessMap.channel};i.applyTextureTransform(o,e.thicknessMap),s.thicknessTexture=o}s.attenuationDistance=e.attenuationDistance,s.attenuationColor=e.attenuationColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class HC{constructor(e){this.writer=e,this.name="KHR_materials_ior"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.ior===1.5)return;const r=this.writer.extensionsUsed,s={};s.ior=e.ior,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class VC{constructor(e){this.writer=e,this.name="KHR_materials_specular"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.specularIntensity===1&&e.specularColor.equals(TC)&&!e.specularIntensityMap&&!e.specularColorMap)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.specularIntensityMap){const o={index:i.processTexture(e.specularIntensityMap),texCoord:e.specularIntensityMap.channel};i.applyTextureTransform(o,e.specularIntensityMap),s.specularTexture=o}if(e.specularColorMap){const o={index:i.processTexture(e.specularColorMap),texCoord:e.specularColorMap.channel};i.applyTextureTransform(o,e.specularColorMap),s.specularColorTexture=o}s.specularFactor=e.specularIntensity,s.specularColorFactor=e.specularColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class jC{constructor(e){this.writer=e,this.name="KHR_materials_sheen"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.sheen==0)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.sheenRoughnessMap){const o={index:i.processTexture(e.sheenRoughnessMap),texCoord:e.sheenRoughnessMap.channel};i.applyTextureTransform(o,e.sheenRoughnessMap),s.sheenRoughnessTexture=o}if(e.sheenColorMap){const o={index:i.processTexture(e.sheenColorMap),texCoord:e.sheenColorMap.channel};i.applyTextureTransform(o,e.sheenColorMap),s.sheenColorTexture=o}s.sheenRoughnessFactor=e.sheenRoughness,s.sheenColorFactor=e.sheenColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class GC{constructor(e){this.writer=e,this.name="KHR_materials_anisotropy"}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.anisotropy==0)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.anisotropyMap){const o={index:i.processTexture(e.anisotropyMap)};i.applyTextureTransform(o,e.anisotropyMap),s.anisotropyTexture=o}s.anisotropyStrength=e.anisotropy,s.anisotropyRotation=e.anisotropyRotation,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class WC{constructor(e){this.writer=e,this.name="KHR_materials_emissive_strength"}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.emissiveIntensity===1)return;const r=this.writer.extensionsUsed,s={};s.emissiveStrength=e.emissiveIntensity,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class XC{constructor(e){this.writer=e,this.name="EXT_materials_bump"}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.bumpScale===1&&!e.bumpMap)return;const i=this.writer,r=i.extensionsUsed,s={};if(e.bumpMap){const o={index:i.processTexture(e.bumpMap),texCoord:e.bumpMap.channel};i.applyTextureTransform(o,e.bumpMap),s.bumpTexture=o}s.bumpFactor=e.bumpScale,t.extensions=t.extensions||{},t.extensions[this.name]=s,r[this.name]=!0}}class $C{constructor(e){this.writer=e,this.name="EXT_mesh_gpu_instancing"}writeNode(e,t){if(!e.isInstancedMesh)return;const i=this.writer,r=e,s=new Float32Array(r.count*3),o=new Float32Array(r.count*4),a=new Float32Array(r.count*3),l=new Qe,c=new O,u=new Bt,h=new O;for(let f=0;f<r.count;f++)r.getMatrixAt(f,l),l.decompose(c,u,h),c.toArray(s,f*3),u.toArray(o,f*4),h.toArray(a,f*3);const p={TRANSLATION:i.processAccessor(new Ht(s,3)),ROTATION:i.processAccessor(new Ht(o,4)),SCALE:i.processAccessor(new Ht(a,3))};r.instanceColor&&(p._COLOR_0=i.processAccessor(r.instanceColor)),t.extensions=t.extensions||{},t.extensions[this.name]={attributes:p},i.extensionsUsed[this.name]=!0,i.extensionsRequired[this.name]=!0}}gh.Utils={insertKeyframe:function(n,e){const i=n.getValueSize(),r=new n.TimeBufferType(n.times.length+1),s=new n.ValueBufferType(n.values.length+i),o=n.createInterpolant(new n.ValueBufferType(i));let a;if(n.times.length===0){r[0]=e;for(let l=0;l<i;l++)s[l]=0;a=0}else if(e<n.times[0]){if(Math.abs(n.times[0]-e)<.001)return 0;r[0]=e,r.set(n.times,1),s.set(o.evaluate(e),0),s.set(n.values,i),a=0}else if(e>n.times[n.times.length-1]){if(Math.abs(n.times[n.times.length-1]-e)<.001)return n.times.length-1;r[r.length-1]=e,r.set(n.times,0),s.set(n.values,0),s.set(o.evaluate(e),n.values.length),a=r.length-1}else for(let l=0;l<n.times.length;l++){if(Math.abs(n.times[l]-e)<.001)return l;if(n.times[l]<e&&n.times[l+1]>e){r.set(n.times.slice(0,l+1),0),r[l+1]=e,r.set(n.times.slice(l+1),l+2),s.set(n.values.slice(0,(l+1)*i),0),s.set(o.evaluate(e),(l+1)*i),s.set(n.values.slice((l+1)*i),(l+2)*i),a=l+1;break}}return n.times=r,n.values=s,a},mergeMorphTargetTracks:function(n,e){const t=[],i={},r=n.tracks;for(let s=0;s<r.length;++s){let o=r[s];const a=tt.parseTrackName(o.name),l=tt.findNode(e,a.nodeName);if(a.propertyName!=="morphTargetInfluences"||a.propertyIndex===void 0){t.push(o);continue}if(o.createInterpolant!==o.InterpolantFactoryMethodDiscrete&&o.createInterpolant!==o.InterpolantFactoryMethodLinear){if(o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)throw new Error("THREE.GLTFExporter: Cannot merge tracks with glTF CUBICSPLINE interpolation.");console.warn("THREE.GLTFExporter: Morph target interpolation mode not yet supported. Using LINEAR instead."),o=o.clone(),o.setInterpolation(nE)}const c=l.morphTargetInfluences.length,u=l.morphTargetDictionary[a.propertyIndex];if(u===void 0)throw new Error("THREE.GLTFExporter: Morph target name not found: "+a.propertyIndex);let h;if(i[l.uuid]===void 0){h=o.clone();const f=new h.ValueBufferType(c*h.times.length);for(let g=0;g<h.times.length;g++)f[g*c+u]=h.values[g];h.name=(a.nodeName||"")+".morphTargetInfluences",h.values=f,i[l.uuid]=h,t.push(h);continue}const p=o.createInterpolant(new o.ValueBufferType(1));h=i[l.uuid];for(let f=0;f<h.times.length;f++)h.values[f*c+u]=p.evaluate(h.times[f]);for(let f=0;f<o.times.length;f++){const g=this.insertKeyframe(h,o.times[f]);h.values[g*c+u]=o.values[f]}}return n.tracks=t,n}};class YC{parse(e){let t="",i=0,r=0,s=0;const o=new O,a=new He,l=new O,c=new we,u=[];function h(g){let y=0,m=0,d=0;const v=g.geometry,_=new Be,M=v.getAttribute("position"),T=v.getAttribute("normal"),b=v.getAttribute("uv"),E=v.getIndex();if(t+="o "+g.name+`
`,g.material&&g.material.name&&(t+="usemtl "+g.material.name+`
`),M!==void 0)for(let P=0,A=M.count;P<A;P++,y++)o.fromBufferAttribute(M,P),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z+`
`;if(b!==void 0)for(let P=0,A=b.count;P<A;P++,d++)c.fromBufferAttribute(b,P),t+="vt "+c.x+" "+c.y+`
`;if(T!==void 0){_.getNormalMatrix(g.matrixWorld);for(let P=0,A=T.count;P<A;P++,m++)l.fromBufferAttribute(T,P),l.applyMatrix3(_).normalize(),t+="vn "+l.x+" "+l.y+" "+l.z+`
`}if(E!==null)for(let P=0,A=E.count;P<A;P+=3){for(let S=0;S<3;S++){const D=E.getX(P+S)+1;u[S]=i+D+(T||b?"/"+(b?r+D:"")+(T?"/"+(s+D):""):"")}t+="f "+u.join(" ")+`
`}else for(let P=0,A=M.count;P<A;P+=3){for(let S=0;S<3;S++){const D=P+S+1;u[S]=i+D+(T||b?"/"+(b?r+D:"")+(T?"/"+(s+D):""):"")}t+="f "+u.join(" ")+`
`}i+=y,r+=d,s+=m}function p(g){let y=0;const m=g.geometry,d=g.type,v=m.getAttribute("position");if(t+="o "+g.name+`
`,v!==void 0)for(let _=0,M=v.count;_<M;_++,y++)o.fromBufferAttribute(v,_),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z+`
`;if(d==="Line"){t+="l ";for(let _=1,M=v.count;_<=M;_++)t+=i+_+" ";t+=`
`}if(d==="LineSegments")for(let _=1,M=_+1,T=v.count;_<T;_+=2,M=_+1)t+="l "+(i+_)+" "+(i+M)+`
`;i+=y}function f(g){let y=0;const m=g.geometry,d=m.getAttribute("position"),v=m.getAttribute("color");if(t+="o "+g.name+`
`,d!==void 0){for(let _=0,M=d.count;_<M;_++,y++)o.fromBufferAttribute(d,_),o.applyMatrix4(g.matrixWorld),t+="v "+o.x+" "+o.y+" "+o.z,v!==void 0&&(a.fromBufferAttribute(v,_).convertLinearToSRGB(),t+=" "+a.r+" "+a.g+" "+a.b),t+=`
`;t+="p ";for(let _=1,M=d.count;_<=M;_++)t+=i+_+" ";t+=`
`}i+=y}return e.traverse(function(g){g.isMesh===!0&&h(g),g.isLine===!0&&p(g),g.isPoints===!0&&f(g)}),t}}class qC{parse(e,t={}){t=Object.assign({binary:!1},t);const i=t.binary,r=[];let s=0;e.traverse(function(d){if(d.isMesh){const v=d.geometry,_=v.index,M=v.getAttribute("position");s+=_!==null?_.count/3:M.count/3,r.push({object3d:d,geometry:v})}});let o,a=80;if(i===!0){const d=s*2+s*3*4*4+80+4,v=new ArrayBuffer(d);o=new DataView(v),o.setUint32(a,s,!0),a+=4}else o="",o+=`solid exported
`;const l=new O,c=new O,u=new O,h=new O,p=new O,f=new O;for(let d=0,v=r.length;d<v;d++){const _=r[d].object3d,M=r[d].geometry,T=M.index,b=M.getAttribute("position");if(T!==null)for(let E=0;E<T.count;E+=3){const P=T.getX(E+0),A=T.getX(E+1),S=T.getX(E+2);g(P,A,S,b,_)}else for(let E=0;E<b.count;E+=3){const P=E+0,A=E+1,S=E+2;g(P,A,S,b,_)}}return i===!1&&(o+=`endsolid exported
`),o;function g(d,v,_,M,T){l.fromBufferAttribute(M,d),c.fromBufferAttribute(M,v),u.fromBufferAttribute(M,_),T.isSkinnedMesh===!0&&(T.applyBoneTransform(d,l),T.applyBoneTransform(v,c),T.applyBoneTransform(_,u)),l.applyMatrix4(T.matrixWorld),c.applyMatrix4(T.matrixWorld),u.applyMatrix4(T.matrixWorld),y(l,c,u),m(l),m(c),m(u),i===!0?(o.setUint16(a,0,!0),a+=2):(o+=`		endloop
`,o+=`	endfacet
`)}function y(d,v,_){h.subVectors(_,v),p.subVectors(d,v),h.cross(p).normalize(),f.copy(h).normalize(),i===!0?(o.setFloat32(a,f.x,!0),a+=4,o.setFloat32(a,f.y,!0),a+=4,o.setFloat32(a,f.z,!0),a+=4):(o+="	facet normal "+f.x+" "+f.y+" "+f.z+`
`,o+=`		outer loop
`)}function m(d){i===!0?(o.setFloat32(a,d.x,!0),a+=4,o.setFloat32(a,d.y,!0),a+=4,o.setFloat32(a,d.z,!0),a+=4):o+="			vertex "+d.x+" "+d.y+" "+d.z+`
`}}}const KC={R1_outer:0,R7_outer:6,R3_cuboid_plusZ:2,R3_cuboid_minusZ:2};function Or(n,e){const t=new Map;for(const s of n)t.has(s.a.moduleId)||t.set(s.a.moduleId,[]),t.has(s.b.moduleId)||t.set(s.b.moduleId,[]),t.get(s.a.moduleId).push(s.b.moduleId),t.get(s.b.moduleId).push(s.a.moduleId);const i=new Set([e]),r=[e];for(;r.length;){const s=r.shift();for(const o of t.get(s)??[])i.has(o)||(i.add(o),r.push(o))}return i}function cc(n,e){return n.getFaceIndicatorMeshes().find(t=>t.userData.faceKey===e)??null}function ZC(n,e,t,i){const r=cc(n,e),s=cc(t,i);return!r||!s?null:(n.robotGroup.updateMatrixWorld(!0),t.robotGroup.updateMatrixWorld(!0),r.updateMatrixWorld(!0),s.updateMatrixWorld(!0),new Qe().copy(r.matrixWorld).invert().multiply(s.matrixWorld).toArray())}function JC(n,e,t,i,r,s){const o=cc(n,e),a=cc(i,r);if(!o||!a||!s)return;n.robotGroup.updateMatrixWorld(!0),o.updateMatrixWorld(!0);const l=new Qe().fromArray(s),c=o.matrixWorld.clone(),u=t?c.clone().multiply(l):c.clone().multiply(l.clone().invert());i.robotGroup.updateMatrixWorld(!0),a.updateMatrixWorld(!0);const h=new Qe().copy(i.robotGroup.matrixWorld).invert().multiply(a.matrixWorld),p=u.clone().multiply(h.clone().invert()),f=new O,g=new Bt,y=new O;p.decompose(f,g,y),i.robotGroup.position.copy(f),i.robotGroup.quaternion.copy(g),i.robotGroup.updateMatrixWorld(!0)}function Zu(n,e,t){const i=new Set([n]);if(!e.length)return i;const r=[n];for(;r.length;){const s=r.shift();for(const o of e){let a,l,c,u;if(o.a.moduleId===s&&!i.has(o.b.moduleId))a=o.a.faceKey,l=o.b.moduleId,c=o.b.faceKey,u=!0;else if(o.b.moduleId===s&&!i.has(o.a.moduleId))a=o.b.faceKey,l=o.a.moduleId,c=o.a.faceKey,u=!1;else continue;const h=t(s),p=t(l);h&&p&&JC(h,a,u,p,c,o.mate),i.add(l),r.push(l)}}return i}function Ju(n,e,t){return n.find(i=>{const r=new Set([i.a.moduleId,i.b.moduleId]);return r.has(e)&&r.has(t)})??null}function Qu(n,e){const t=n.a.moduleId===e?n.a:n.b;return KC[t.faceKey]??0}function QC(n,e,t){if(e===t)return[e];const i=new Map;for(const a of n)i.has(a.a.moduleId)||i.set(a.a.moduleId,[]),i.has(a.b.moduleId)||i.set(a.b.moduleId,[]),i.get(a.a.moduleId).push(a.b.moduleId),i.get(a.b.moduleId).push(a.a.moduleId);const r=new Map([[e,null]]),s=[e];for(;s.length;){const a=s.shift();if(a===t)break;for(const l of i.get(a)??[])r.has(l)||(r.set(l,a),s.push(l))}if(!r.has(t))return null;const o=[];for(let a=t;a!=null;a=r.get(a))o.unshift(a);return o}function eR({welds:n,getFK:e,getAngles:t,baseId:i,baseRootRodId:r,dragId:s,dragRodId:o,mode:a}){const l=QC(n,i,s);if(!l||l.length<2)return null;const c=Zn.indexOf(r),u=[],h=[],p=[],f=[];for(let M=0;M<l.length;M++){const T=l[M],b=e(T);if(!b)return null;const E=b.getJointWorldData(a),P=t(T),A=M===0?c:Qu(Ju(n,l[M-1],T),T),S=M===l.length-1?Zn.indexOf(o):Qu(Ju(n,T,l[M+1]),T),D=Math.min(A,S),B=Math.max(A,S);for(let L=D;L<B;L++)u.push(E[L]),h.push(P[L]??0),p.push(yt[L]),f.push({moduleId:T,localIdx:L})}if(u.length===0)return null;const y=e(s).getNodePositions(),m=l.length<2?c:Qu(Ju(n,l[l.length-2],s),s),d=Zn.indexOf(o),v=d>m?Math.min(d,5):Math.max(d-1,0),_=y[v].clone();return{jointData:u,angles:h,defs:p,backmap:f,dragPos:_}}const J_="tetrobot:autosave:v1";function tR(n){try{localStorage.setItem(J_,JSON.stringify(n))}catch{}}function nR(){try{const n=localStorage.getItem(J_);return n?JSON.parse(n):null}catch{return null}}const $o=ro(n=>({canUndo:!1,canRedo:!1,setFlags:(e,t)=>n({canUndo:e,canRedo:t})})),ms=new $_;function iR(n,e,t){var j,Q,$;const i=(j=t.get(n.moduleId))==null?void 0:j.robotFK,r=(Q=t.get(e.moduleId))==null?void 0:Q.robotFK;if(!i||!r)return;const s=Re.getState(),o=Or(s.welds,n.moduleId),l=Or(s.welds,e.moduleId).size<=o.size,c=l?e:n,u=l?n:e,h=l?r:i,p=l?i:r;i.robotGroup.updateMatrixWorld(!0),r.robotGroup.updateMatrixWorld(!0);const f=p.getFaceIndicatorMeshes().find(F=>F.userData.faceKey===u.faceKey),g=h.getFaceIndicatorMeshes().find(F=>F.userData.faceKey===c.faceKey);if(!f||!g)return;f.updateMatrixWorld(!0),g.updateMatrixWorld(!0);const y=f.getWorldPosition(new O),m=new O(0,0,1).transformDirection(f.matrixWorld).normalize(),d=g.getWorldPosition(new O),v=new O(0,0,1).transformDirection(g.matrixWorld).normalize(),_=new Bt().setFromUnitVectors(v,m.clone().negate()),M=h.robotGroup.position.clone(),T=h.robotGroup.quaternion.clone(),b=_.clone().multiply(T),E=d.clone().sub(M),P=y.clone().sub(E.applyQuaternion(_)),A=new O(1,1,1),S=new Qe().compose(M,T,A),B=new Qe().compose(P,b,A).clone().multiply(S.clone().invert()),L=Or(s.welds,c.moduleId);for(const F of L){const H=($=t.get(F))==null?void 0:$.robotFK;if(!H)continue;const W=new Qe().compose(H.robotGroup.position.clone(),H.robotGroup.quaternion.clone(),A),z=B.clone().multiply(W),re=new O,K=new Bt,k=new O;z.decompose(re,K,k),H.robotGroup.position.copy(re),H.robotGroup.quaternion.copy(K),H.robotGroup.updateMatrixWorld(!0),s.setModuleTransform(F,re,K)}const V=ZC(i,n.faceKey,r,e.faceKey);s.applyJoin({a:{moduleId:n.moduleId,faceKey:n.faceKey},b:{moduleId:e.moduleId,faceKey:e.faceKey},mate:V}),setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},80)}function ed(n,e){for(const[t,{robotFK:i}]of e)if(i.interactables.includes(n)||i.getFaceIndicatorMeshes().includes(n))return t;return null}function rR(){const n=te.useRef(null),e=te.useRef(null),t=te.useRef(null),i=te.useRef(null),r=te.useRef(new Map),s=te.useRef(null),o=te.useRef("module-0"),a=te.useRef({pickup:null}),l=te.useRef(null),c=te.useRef({undo:[],redo:[],last:null});te.useEffect(()=>{const v=n.current;if(!v)return;const _=ct.getState(),M=Re.getState(),T=new cC(v);e.current=T,T.applyTheme(gr.getState().theme);const b=gr.subscribe(z=>T.applyTheme(z.theme)),E=M.modules[0],P=new ju(T.scene);P.robotGroup.position.set(E.position.x,E.position.y,E.position.z),r.current.set(E.id,{robotFK:P}),s.current=P;const A=new gC(v,T.camera,()=>{const z=[];for(const[,{robotFK:re}]of r.current)z.push(...re.interactables);return z},z=>ed(z,r.current),{});i.current=A;const S={setJointAngle:_.setJointAngle,setJointTelemetry:_.setJointTelemetry,setStatus:_.setStatus,updateEndEffector:_.updateEndEffector,setRootRod:_.setRootRod,setRootAndAngles:_.setRootAndAngles,clearPendingHome:_.clearPendingHome,setAllAngles:_.setAllAngles,setCollision:_.setCollision},D=new EC(T,P,A,()=>ct.getState(),S);D.getOtherModuleBounds=()=>{const z=Re.getState(),re=Or(z.welds,z.activeModuleId),K=[];for(const[k,{robotFK:I}]of r.current){if(re.has(k))continue;I.robotGroup.updateMatrixWorld(!0);const ne=new Dn().setFromObject(I.robotGroup);ne.isEmpty()||K.push(ne)}return K},D.extraTick=()=>{const z=Re.getState(),re=z.activeModuleId;for(const[k,{robotFK:I}]of r.current){if(k===re)continue;const ne=z.modules.find(ee=>ee.id===k);ne&&I.updateAngles(ne.angles,ne.mode??"horizontal")}const K=l.current;if(K){const k=Math.min((performance.now()-K.start)/K.duration,1),I=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,ne=o.current;for(const ee of K.items)if(ee.fk.robotGroup.position.lerpVectors(ee.startPos,ee.endPos,I),ee.fk.robotGroup.quaternion.slerpQuaternions(ee.startQuat,ee.endQuat,I),ee.startAngles){const pe=ee.startAngles.map(Ee=>Ee*(1-I));ee.id===ne?ct.getState().setAllAngles(pe):ee.fk.updateAngles(pe,ee.mode)}if(k>=1){for(const ee of K.items)ee.id===ne?ct.getState().setAllAngles([0,0,0,0,0,0]):ee.fk.updateAngles([0,0,0,0,0,0],ee.mode);l.current=null}}},D.postTick=()=>{const z=Re.getState();z.welds.length&&Zu(z.activeModuleId,z.welds,re=>{var K;return((K=r.current.get(re))==null?void 0:K.robotFK)??null})},D.onInteractionEnd=()=>{var k;const z=Re.getState(),re=z.activeModuleId,K=Or(z.welds,re);for(const I of K){if(I===re)continue;const ne=(k=r.current.get(I))==null?void 0:k.robotFK;ne&&z.setModuleTransform(I,ne.robotGroup.position.clone(),ne.robotGroup.quaternion.clone())}setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},60)},oe.homeAll=()=>{var K;ct.getState().homeArm();const z=Re.getState(),re=o.current;for(const[k,{robotFK:I}]of r.current){if(k===re)continue;const ne=((K=z.modules.find(ee=>ee.id===k))==null?void 0:K.mode)??"horizontal";z.setModuleAngles(k,[0,0,0,0,0,0]),I.updateAngles([0,0,0,0,0,0],ne)}setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},900)},oe.estop=()=>{var z;return(z=t.current)==null?void 0:z.cancelMotion()},oe.disconnectAll=()=>{var ne,ee;(ne=t.current)==null||ne.cancelMotion();const z=ct.getState(),re=Re.getState(),K=o.current,k=new Map;for(const[pe,{robotFK:Ee}]of r.current){Ee.robotGroup.updateMatrixWorld(!0);const U=re.modules.find(Me=>Me.id===pe);k.set(pe,{pos:Ee.robotGroup.position.clone(),quat:Ee.robotGroup.quaternion.clone(),angles:pe===K?[...z.jointAngles]:[...(U==null?void 0:U.angles)??[0,0,0,0,0,0]],mode:pe===K?z.mode||"horizontal":(U==null?void 0:U.mode)??"horizontal"})}Re.getState().disconnectAll();const I=[];for(const pe of Re.getState().modules){const Ee=(ee=r.current.get(pe.id))==null?void 0:ee.robotFK,U=k.get(pe.id);!Ee||!U||I.push({id:pe.id,fk:Ee,mode:U.mode,startPos:U.pos,startQuat:U.quat,startAngles:U.angles,endPos:new O(pe.position.x,pe.position.y,pe.position.z),endQuat:new Bt(pe.quaternion.x,pe.quaternion.y,pe.quaternion.z,pe.quaternion.w)})}l.current={items:I,start:performance.now(),duration:800},setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},820)},t.current=D,D.start(),oe.getArmNodes=()=>{const z=new Dn;let re=!1;for(const[,{robotFK:k}]of r.current){k.robotGroup.updateMatrixWorld(!0);const I=new Dn().setFromObject(k.robotGroup);I.isEmpty()||(z.union(I),re=!0)}if(!re)return[];const K=new O;return z.getCenter(K),[{x:z.min.x,y:z.min.y,z:z.min.z},{x:z.max.x,y:z.max.y,z:z.max.z},{x:K.x,y:K.y,z:K.z}]},oe.computeFreeSpawn=()=>{const z=new Dn;let re=!1;for(const[,{robotFK:K}]of r.current){K.robotGroup.updateMatrixWorld(!0);const k=new Dn().setFromObject(K.robotGroup);k.isEmpty()||(z.union(k),re=!0)}return re?{x:0,y:0,z:z.max.z+1.2}:{x:0,y:0,z:0}},oe.commitLiveState=()=>{const z=Re.getState(),re=ct.getState(),K=o.current,k=s.current;k&&K&&z.modules.some(I=>I.id===K)&&z.saveModuleState(K,{angles:[...re.jointAngles],activeRootId:re.activeRootId,position:k.robotGroup.position.clone(),quaternion:k.robotGroup.quaternion.clone(),mode:re.mode});for(const[I,{robotFK:ne}]of r.current)I!==K&&z.setModuleTransform(I,ne.robotGroup.position.clone(),ne.robotGroup.quaternion.clone())},oe.loadScene=(z,re={})=>{const K=e.current;if(!K)return{ok:!1,error:"scene not ready"};let k;try{k=sS(z)}catch(I){return{ok:!1,error:I.message}}for(const[,{robotFK:I}]of r.current)K.scene.remove(I.robotGroup);r.current.clear(),Re.setState({modules:k.modules,welds:k.welds,activeModuleId:k.activeModuleId,nextId:k.nextId,connectMode:!1,disconnectMode:!1,deleteMode:!1,dSel1:null,dSel2:null,face1:null,face2:null,connectError:null,disconnectError:null});for(const I of k.modules){const ne=new ju(K.scene);ne.robotGroup.position.set(I.position.x,I.position.y,I.position.z),ne.robotGroup.quaternion.set(I.quaternion.x,I.quaternion.y,I.quaternion.z,I.quaternion.w),ne.updateAngles(I.angles,I.mode??"horizontal"),r.current.set(I.id,{robotFK:ne})}return o.current="__none__",s.current=null,h(k.activeModuleId),re.fit!==!1&&setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},60),{ok:!0}};const B=z=>{oe.loadScene({format:"tetrobot-project",version:1,scene:JSON.parse(z)},{fit:!1})};oe.undo=()=>{const z=c.current;if(!z.undo.length)return;z.last!=null&&z.redo.push(z.last);const re=z.undo.pop();z.last=re,z.suppressNext=!0,B(re),$o.getState().setFlags(z.undo.length>0,z.redo.length>0)},oe.redo=()=>{const z=c.current;if(!z.redo.length)return;z.last!=null&&z.undo.push(z.last);const re=z.redo.pop();z.last=re,z.suppressNext=!0,B(re),$o.getState().setFlags(z.undo.length>0,z.redo.length>0)},oe.exportModel=z=>{const re=(z||"glb").toLowerCase();if(re==="step")return{ok:!1,error:"STEP is a CAD (solid) format — exporting tessellated meshes to STEP needs a CAD kernel, so it isn’t supported yet. Use OBJ / STL / GLB, or import the .nischay file into Blender."};const K=new Ns;for(const[,{robotFK:I}]of r.current)I.robotGroup.updateMatrixWorld(!0),K.add(I.robotGroup.clone(!0));const k=[];return K.traverse(I=>{var ne;I.isMesh&&(I.visible===!1||((ne=I.userData)==null?void 0:ne.type)==="face")&&k.push(I)}),k.forEach(I=>I.parent&&I.parent.remove(I)),re==="glb"?(new gh().parse(K,I=>{const ne=I instanceof ArrayBuffer?new Blob([I],{type:"model/gltf-binary"}):new Blob([JSON.stringify(I)],{type:"model/gltf+json"});wl(ne,"tetrobot.glb")},I=>console.error("GLB export failed:",I),{binary:!0,onlyVisible:!0}),{ok:!0}):re==="obj"?(wl(new Blob([new YC().parse(K)],{type:"text/plain"}),"tetrobot.obj"),{ok:!0}):re==="stl"?(wl(new Blob([new qC().parse(K)],{type:"model/stl"}),"tetrobot.stl"),{ok:!0}):{ok:!1,error:`Unknown format: ${z}`}};const L=nR();L&&oe.loadScene(L);let V=null,j=!1;const Q=async()=>{j=!0;try{const z=Jf();tR(z);const re=JSON.stringify(z.scene),K=c.current;K.suppressNext?K.suppressNext=!1:K.last!==null&&re!==K.last&&(K.undo.push(K.last),K.undo.length>20&&K.undo.shift(),K.redo=[]),K.last=re,$o.getState().setFlags(K.undo.length>0,K.redo.length>0);const k=zn.getState();if(k.handle){k.setStatus("saving");try{await cS(k.handle,z),zn.getState().setStatus("saved")}catch{zn.getState().setStatus("idle")}}}catch{}finally{j=!1}},$=()=>{j||(clearTimeout(V),V=setTimeout(Q,800))},F=Re.subscribe($),H=ct.subscribe($),W=setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},300);return()=>{clearTimeout(W),clearTimeout(V),F(),H(),b(),D.stop(),A.dispose(),T.dispose(),r.current.clear(),e.current=null,t.current=null,i.current=null}},[]);const u=Re(v=>v.modules.map(_=>_.id).join(","));te.useEffect(()=>{const v=e.current;if(!v)return;const _=Re.getState();for(const T of _.modules)if(!r.current.has(T.id)){const b=new ju(v.scene);b.robotGroup.position.set(T.position.x,T.position.y,T.position.z),b.robotGroup.quaternion.set(T.quaternion.x,T.quaternion.y,T.quaternion.z,T.quaternion.w),b.updateAngles(T.angles,T.mode??"horizontal"),_.connectMode&&b.showFaceIndicators(!0),r.current.set(T.id,{robotFK:b})}for(const[T,{robotFK:b}]of r.current)_.modules.find(E=>E.id===T)||(v.scene.remove(b.robotGroup),r.current.delete(T));const M=setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},80);return()=>clearTimeout(M)},[u]);const h=te.useCallback(v=>{var B;const _=t.current;if(!_||o.current===v)return;const M=Re.getState(),T=ct.getState(),b=s.current,E=o.current;b&&E&&E!==v&&M.saveModuleState(E,{angles:[...T.jointAngles],activeRootId:T.activeRootId,position:b.robotGroup.position.clone(),quaternion:b.robotGroup.quaternion.clone(),mode:T.mode});const P=M.modules.find(L=>L.id===v),A=(B=r.current.get(v))==null?void 0:B.robotFK;if(!P||!A)return;const S=A.robotGroup.position.clone(),D=A.robotGroup.quaternion.clone();T.setRootAndAngles(P.activeRootId,P.angles),A.rebuild(P.activeRootId,P.angles,S,D),s.current=A,_.swapRobotFK(A),A.robotGroup.updateMatrixWorld(!0),M.connectMode&&A.showFaceIndicators(!0),o.current=v},[]),p=Re(v=>v.activeModuleId);te.useEffect(()=>{h(p)},[p,h]);const f=te.useCallback((v,_,M,T,b)=>{var re;const E=(re=e.current)==null?void 0:re.camera;if(!E||!v||!_)return;const P=o.current,A=Re.getState(),S=ct.getState(),D=K=>{var k;return((k=r.current.get(K))==null?void 0:k.robotFK)??null},B=K=>{var k;return K===P?S.jointAngles:((k=A.modules.find(I=>I.id===K))==null?void 0:k.angles)??[0,0,0,0,0,0]},L=eR({welds:A.welds,getFK:D,getAngles:B,baseId:P,baseRootRodId:S.activeRootId,dragId:v,dragRodId:_,mode:T});if(!L)return;if(b){const K=L.dragPos.clone().project(E);a.current.pickup={x:M.x-K.x,y:M.y-K.y};return}const V=a.current.pickup??{x:0,y:0},j=L.jointData.map((K,k)=>k),Q=q_(L.dragPos,L.jointData,j,E,{x:M.x,y:M.y},V,L.angles,L.defs,Go,.008,.5),$=new Map,F=K=>($.has(K)||$.set(K,[...B(K)]),$.get(K));L.backmap.forEach((K,k)=>{F(K.moduleId)[K.localIdx]=Q[k]});for(const[K,k]of $){const I=D(K);I&&I.updateAngles(k,T)}Zu(P,A.welds,D);let H=!1;const W=["R1","R2","R3","R4","R5","R6","R7"],z=Or(A.welds,P);e:for(const K of $.keys()){const k=D(K);if(!k)continue;const I=k.getLinkBounds();for(let ne=0;ne<W.length;ne++)for(let ee=ne+3;ee<W.length;ee++){const pe=I[W[ne]],Ee=I[W[ee]];if(pe&&Ee&&pe.clone().expandByScalar(-.02).intersectsBox(Ee.clone().expandByScalar(-.02))){H=!0;break e}}}if(!H){const K=new Map,k=ee=>{if(K.has(ee))return K.get(ee);const pe=D(ee);if(!pe)return K.set(ee,null),null;pe.robotGroup.updateMatrixWorld(!0);const Ee=new Dn().setFromObject(pe.robotGroup);return K.set(ee,Ee),Ee},I=(ee,pe)=>A.welds.some(Ee=>{const U=new Set([Ee.a.moduleId,Ee.b.moduleId]);return U.has(ee)&&U.has(pe)}),ne=[...r.current.keys()];e:for(const ee of z){const pe=k(ee);if(pe)for(const Ee of ne){if(Ee===ee||I(ee,Ee))continue;const U=k(Ee);if(U&&pe.clone().expandByScalar(-.05).intersectsBox(U.clone().expandByScalar(-.05))){H=!0;break e}}}}if(H){for(const[K]of $){const k=D(K);k&&k.updateAngles(B(K),T)}Zu(P,A.welds,D),ct.getState().setCollision(!0);return}for(const[K,k]of $)K===P?ct.getState().setAllAngles(k):A.setModuleAngles(K,k);ct.getState().setCollision(!1)},[]),g=te.useCallback(()=>{a.current.pickup=null},[]);te.useEffect(()=>{const v=t.current;v&&(v.getActiveModuleId=()=>o.current,v.activateModule=_=>{h(_),Re.getState().setActiveModule(_)},v.crossModuleStep=f,v.crossModuleEnd=g,v.isInActiveAssembly=_=>{const M=Re.getState();return Or(M.welds,o.current).has(_)})},[h,f,g]);const y=Re(v=>v.connectMode);te.useEffect(()=>{const v=i.current,_=t.current;if(!(!v||!_)){v.paused=y,_.setConnectMode(y);for(const[,{robotFK:M}]of r.current)M.showFaceIndicators(y),y||M.resetFaceHighlights()}},[y]);const m=Re(v=>v.disconnectMode);te.useEffect(()=>{const v=i.current,_=t.current;!v||!_||y||(v.paused=m,_.setConnectMode(m))},[m,y]),te.useEffect(()=>{const v=n.current;if(!v||!m)return;let _=0,M=0;const T=E=>{_=E.clientX,M=E.clientY},b=E=>{var F;const P=E.clientX-_,A=E.clientY-M;if(Math.sqrt(P*P+A*A)>5)return;const S=e.current;if(!S)return;const D=v.getBoundingClientRect(),B=(E.clientX-D.left)/D.width*2-1,L=-((E.clientY-D.top)/D.height)*2+1;ms.setFromCamera({x:B,y:L},S.camera);const V=[];for(const[,{robotFK:H}]of r.current)V.push(...H.interactables);const j=ms.intersectObjects(V,!1);if(!j.length)return;const Q=ed(j[0].object,r.current);if(!Q)return;const $=Re.getState();if(!$.dSel1)$.setDSel1(Q);else if($.dSel1===Q)$.setDisconnectError("Select a DIFFERENT module."),setTimeout(()=>Re.getState().setDisconnectError(null),1500);else{$.setDSel2(Q);const H=(F=r.current.get(Q))==null?void 0:F.robotFK;if(H){const W=$.modules,z=new Set(W.filter(K=>K.id!==Q).map(K=>Math.round(K.position.z/4)));let re=0;for(;z.has(re);)re++;H.robotGroup.position.set(0,0,re*4),H.robotGroup.quaternion.identity()}$.applyDisconnect(Q),setTimeout(()=>{oe.fitCamera&&oe.fitCamera()},80)}};return v.addEventListener("mousedown",T),v.addEventListener("mouseup",b),()=>{v.removeEventListener("mousedown",T),v.removeEventListener("mouseup",b)}},[m]);const d=Re(v=>v.deleteMode);return te.useEffect(()=>{const v=i.current,_=t.current;!v||!_||!y&&!m&&(v.paused=d,_.setConnectMode(d))},[d,y,m]),te.useEffect(()=>{const v=n.current;if(!v||!d)return;let _=0,M=0;const T=E=>{_=E.clientX,M=E.clientY},b=E=>{const P=E.clientX-_,A=E.clientY-M;if(Math.sqrt(P*P+A*A)>5)return;const S=e.current;if(!S)return;const D=v.getBoundingClientRect(),B=(E.clientX-D.left)/D.width*2-1,L=-((E.clientY-D.top)/D.height)*2+1;ms.setFromCamera({x:B,y:L},S.camera);const V=[];for(const[,{robotFK:F}]of r.current)V.push(...F.interactables);const j=ms.intersectObjects(V,!1);if(!j.length)return;const Q=ed(j[0].object,r.current);if(!Q)return;const $=Re.getState();$.modules.length<=1||($.setDeleteMode(!1),$.removeModule(Q))};return v.addEventListener("mousedown",T),v.addEventListener("mouseup",b),()=>{v.removeEventListener("mousedown",T),v.removeEventListener("mouseup",b)}},[d]),te.useEffect(()=>{const v=n.current;if(!v||!y)return;let _=0,M=0;const T=E=>{_=E.clientX,M=E.clientY},b=E=>{var z;const P=E.clientX-_,A=E.clientY-M;if(Math.sqrt(P*P+A*A)>5)return;const S=e.current;if(!S)return;const D=v.getBoundingClientRect(),B=(E.clientX-D.left)/D.width*2-1,L=-((E.clientY-D.top)/D.height)*2+1;ms.setFromCamera({x:B,y:L},S.camera);const V=[];for(const[re,{robotFK:K}]of r.current)for(const k of K.getFaceIndicatorMeshes())k.userData.moduleId=re,V.push(k);const j=ms.intersectObjects(V,!1);if(!j.length)return;const Q=j[0].object,$=Q.userData.faceKey,F=Q.userData.moduleId,H=(z=r.current.get(F))==null?void 0:z.robotFK;if(!H)return;const W=Re.getState();W.face1?F===W.face1.moduleId?(W.setConnectError("Select a face from a DIFFERENT module."),H.setFaceHighlight($,"error"),setTimeout(()=>{H.setFaceHighlight($,"normal"),Re.getState().setConnectError(null)},1500)):(W.setFace2({moduleId:F,faceKey:$}),H.setFaceHighlight($,"selected2"),iR(W.face1,{moduleId:F,faceKey:$},r.current)):(W.setFace1({moduleId:F,faceKey:$}),H.setFaceHighlight($,"selected1"))};return v.addEventListener("mousedown",T),v.addEventListener("mouseup",b),()=>{v.removeEventListener("mousedown",T),v.removeEventListener("mouseup",b)}},[y]),x.jsx("canvas",{ref:n,style:{display:"block",width:"100%",height:"100%"}})}function sR(){const n=ct(s=>s.collision),e=ct(s=>s.joints),t=e.some(s=>s.limitHit),i=e.some(s=>Math.abs(s.velocity)>1);let r;return n?r={label:"BLOCKED",dot:"#ff3b30",pulse:!0}:t?r={label:"JOINT LIMIT",dot:"#ff7a00",pulse:!0}:i?r={label:"MOVING",dot:"#00cc66",pulse:!0}:r={label:"IDLE",dot:"#00aaff",pulse:!1},x.jsxs("div",{className:`status-bar fade-in ${r.pulse?"pulse":""}`,children:[x.jsx("div",{className:"status-dot",style:{background:r.dot,boxShadow:`0 0 8px ${r.dot}`,animation:r.pulse?"dotPulse 0.8s ease-in-out infinite alternate":"none"}}),x.jsx("span",{className:"status-label",style:{color:r.dot},children:r.label})]})}const nf=110,xi=nf/2,Ag=40,oR=14,aR=10,bg=[{key:"+X",dir:[1,0,0],label:"X",color:"#e84040",glow:"#ff000044",isPos:!0},{key:"-X",dir:[-1,0,0],label:"-X",color:"#cc6666",glow:"#cc000022",isPos:!1},{key:"+Y",dir:[0,1,0],label:"Y",color:"#22cc55",glow:"#00ff4444",isPos:!0},{key:"-Y",dir:[0,-1,0],label:"-Y",color:"#66bb88",glow:"#00cc2222",isPos:!1},{key:"+Z",dir:[0,0,1],label:"Z",color:"#4488ff",glow:"#0044ff44",isPos:!0},{key:"-Z",dir:[0,0,-1],label:"-Z",color:"#7799cc",glow:"#0022cc22",isPos:!1}],lR={"+X":{pos:{x:14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"-X":{pos:{x:-14,y:1.5,z:0},lookAt:{x:0,y:0,z:0}},"+Y":{pos:{x:0,y:14,z:.5},lookAt:{x:0,y:0,z:0}},"-Y":{pos:{x:.5,y:-5,z:6},lookAt:{x:0,y:0,z:0}},"+Z":{pos:{x:0,y:1.5,z:14},lookAt:{x:0,y:0,z:0}},"-Z":{pos:{x:0,y:1.5,z:-14},lookAt:{x:0,y:0,z:0}}},Cg={pos:{x:0,y:7,z:9},lookAt:{x:0,y:0,z:0}},To=new O;function cR(){const[n,e]=te.useState([]),[t,i]=te.useState(null),r=te.useRef(null),s=te.useRef(!1),o=te.useRef({x:0,y:0}),a=te.useRef(null);te.useEffect(()=>{const f=()=>{const g=oe.camera;if(g){g.updateMatrixWorld();const y=bg.map(m=>(To.set(...m.dir),To.transformDirection(g.matrixWorldInverse),{...m,sx:xi+To.x*Ag,sy:xi-To.y*Ag,depth:To.z}));y.sort((m,d)=>d.depth-m.depth),e(y)}r.current=requestAnimationFrame(f)};return r.current=requestAnimationFrame(f),()=>cancelAnimationFrame(r.current)},[]);const l=te.useCallback(f=>{const g=lR[f];g&&oe.animateTo&&oe.animateTo(g.pos,g.lookAt)},[]),c=te.useCallback(()=>{oe.animateTo&&oe.animateTo(Cg.pos,Cg.lookAt)},[]),u=te.useCallback(f=>{var g;f.stopPropagation(),(g=a.current)==null||g.setPointerCapture(f.pointerId),s.current=!0,o.current={x:f.clientX,y:f.clientY}},[]),h=te.useCallback(f=>{if(!s.current)return;const g=f.clientX-o.current.x,y=f.clientY-o.current.y;o.current={x:f.clientX,y:f.clientY},oe.orbitDelta&&oe.orbitDelta(g,y)},[]),p=te.useCallback(f=>{var g;s.current=!1,(g=a.current)==null||g.releasePointerCapture(f.pointerId)},[]);return x.jsxs("div",{className:"gizmo-wrap",children:[x.jsxs("svg",{ref:a,width:nf,height:nf,style:{overflow:"visible",display:"block",cursor:s.current?"grabbing":"grab"},onPointerMove:h,onPointerUp:p,children:[x.jsx("defs",{children:x.jsxs("radialGradient",{id:"gizmo-bg",cx:"50%",cy:"50%",r:"50%",children:[x.jsx("stop",{offset:"0%",stopColor:"rgba(255,255,255,0.22)"}),x.jsx("stop",{offset:"100%",stopColor:"rgba(200,215,235,0.06)"})]})}),x.jsx("circle",{cx:xi,cy:xi,r:xi-4,fill:"url(#gizmo-bg)",stroke:"rgba(180,200,225,0.4)",strokeWidth:"1",style:{cursor:"grab"},onPointerDown:u}),n.map(f=>{const g=f.depth<0;return x.jsx("line",{x1:xi,y1:xi,x2:f.sx,y2:f.sy,stroke:f.color,strokeWidth:g?2:1,opacity:g?.85:.28,style:{pointerEvents:"none"}},`ln-${f.key}`)}),n.map(f=>{const g=f.depth<0,y=f.isPos?oR:aR,m=t===f.key,d=g?1:f.isPos?.42:.2;return x.jsxs("g",{opacity:d,style:{cursor:"pointer"},onMouseEnter:()=>i(f.key),onMouseLeave:()=>i(null),onClick:v=>{v.stopPropagation(),l(f.key)},children:[m&&x.jsx("circle",{cx:f.sx,cy:f.sy,r:y+5,fill:f.glow,stroke:f.color,strokeWidth:"1",opacity:"0.7"}),x.jsx("rect",{x:f.sx-y,y:f.sy-y,width:y*2,height:y*2,rx:f.isPos?4:3,fill:m||f.isPos?f.color:"rgba(200,215,235,0.75)",stroke:f.isPos?"rgba(255,255,255,0.4)":"rgba(120,140,170,0.3)",strokeWidth:"0.8"}),x.jsx("text",{x:f.sx,y:f.sy,textAnchor:"middle",dominantBaseline:"central",fontSize:f.isPos?9.5:7,fontWeight:"700",fontFamily:"'Share Tech Mono', monospace",fill:f.isPos?"white":"#334466",style:{pointerEvents:"none",userSelect:"none"},children:f.label})]},`dot-${f.key}`)}),x.jsx("circle",{cx:xi,cy:xi,r:"6",fill:"rgba(80,100,130,0.75)",stroke:"rgba(255,255,255,0.65)",strokeWidth:"1",style:{cursor:"pointer"},onClick:f=>{f.stopPropagation(),c()}})]}),x.jsx("div",{className:"gizmo-btn-row",children:["+X","+Y","+Z"].map(f=>{var g;return x.jsx("button",{className:"gizmo-axis-btn",onClick:()=>l(f),style:{"--ax-color":(g=bg.find(y=>y.key===f))==null?void 0:g.color},children:f},f)})})]})}function uR({isConnOpen:n,onConnToggle:e}){const t=te.useCallback(()=>{oe.fitCamera&&oe.fitCamera()},[]);return x.jsxs("div",{className:"view-controls",children:[x.jsxs("button",{className:"view-btn",onClick:t,title:"Fit arm in view",children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("rect",{x:"1",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"9",y:"1",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"1",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("rect",{x:"9",y:"9",width:"4",height:"4",rx:"1",stroke:"currentColor",strokeWidth:"1.4",fill:"none"})]}),"FIT"]}),x.jsxs("button",{className:`view-btn${n?" view-btn--active":""}`,onClick:e,title:"Toggle connection panel",children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("path",{d:"M1.5 5.5C1.5 3.3 3.3 1.5 5.5 1.5",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"}),x.jsx("path",{d:"M1.5 9C1.5 5.4 4.2 2.5 7.5 2",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round",opacity:"0.5"}),x.jsx("path",{d:"M4 7C4 5.3 5.3 4 7 4",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"}),x.jsx("circle",{cx:"7",cy:"9",r:"2",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"9",r:"0.8",fill:"currentColor"})]}),"CONN"]})]})}const dR=120;function fR(){const n=new Date,e=n.getHours().toString().padStart(2,"0"),t=n.getMinutes().toString().padStart(2,"0"),i=n.getSeconds().toString().padStart(2,"0"),r=n.getMilliseconds().toString().padStart(3,"0");return`${e}:${t}:${i}.${r}`}function Ao(n,e,t){return{id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:fR(),level:n,src:e,msg:t}}function bo(n,e){return n.length>=dR?[...n.slice(1),e]:[...n,e]}const nt=ro((n,e)=>({espUrl:"http://nischaylap.local",connected:!1,latencyMs:null,servoOnlineCount:0,pendingAngles:null,lastSentAngles:{},simLog:[],ctrlLog:[],stats:{queued:0,sent:0,failed:0},avgVoltage:null,totalCurrentMA:null,overcurrentServos:[],setEspUrl:t=>n({espUrl:t}),setConnected:(t,i)=>n({connected:t,latencyMs:i??null}),setServoOnlineCount:t=>n({servoOnlineCount:t}),setAvgVoltage:t=>n({avgVoltage:t}),setTotalCurrentMA:t=>n({totalCurrentMA:t}),setOvercurrentServos:t=>n({overcurrentServos:t}),queueAngles:t=>{const{lastSentAngles:i,connected:r}=e();if(!r)return!1;const s={};for(const[a,l]of Object.entries(t)){const c=i[a];(c==null||Math.abs(l-c)>=.8)&&(s[a]=l)}if(!Object.keys(s).length)return!1;const o=Object.entries(s).sort(([a],[l])=>Number(a)-Number(l)).map(([a,l])=>`J${a}→${Number(l).toFixed(1)}°`).join(" ");return n(a=>({pendingAngles:{...t},stats:{...a.stats,queued:a.stats.queued+1},simLog:bo(a.simLog,Ao("queued","SIM",`TX ${o}`))})),!0},consumeAngles:()=>n({pendingAngles:null}),markSent:t=>n(i=>({lastSentAngles:{...i.lastSentAngles,...t}})),simSent:t=>n(i=>({stats:{...i.stats,sent:i.stats.sent+1},simLog:bo(i.simLog,Ao("sent","ESP",`OK  ${t}`))})),simFailed:t=>n(i=>({stats:{...i.stats,failed:i.stats.failed+1},simLog:bo(i.simLog,Ao("error","ERR",`ERR ${t}`))})),simOffline:t=>n(i=>({simLog:bo(i.simLog,Ao("offline","OFF",`ESP OFFLINE — ${t}`))})),pushCtrlLog:(t,i,r)=>n(s=>({ctrlLog:bo(s.ctrlLog,Ao(t,i,r))})),clearSimLog:()=>n({simLog:[]}),clearCtrlLog:()=>n({ctrlLog:[]}),resetStats:()=>n({stats:{queued:0,sent:0,failed:0}})})),Bn=[{id:1,label:"J1",name:"CUBE LEFT",type:"twist",color:"#f59e0b"},{id:2,label:"J2",name:"JOINT 1",type:"bend",color:"#6ee7ff"},{id:3,label:"J3",name:"JOINT 2",type:"bend",color:"#a78bfa"},{id:4,label:"J4",name:"WRIST",type:"twist",color:"#fb923c"},{id:5,label:"J5",name:"JOINT 3",type:"bend",color:"#34d399"},{id:6,label:"J6",name:"CUBE RIGHT",type:"twist",color:"#f59e0b"}],hR=(()=>{const n={};let e=0,t=0;for(const i of Bn)i.type==="twist"?n[i.id]={type:"twist",num:++e}:n[i.id]={type:"bend",num:++t};return n})(),pR=120,mR=50,Rg=55,Pg=2e3,Q_=8e3;function td(n,e=1){return n==null||!Number.isFinite(Number(n))?"—":Number(n).toFixed(e)}function Ng(n,e){const t=[...n,e];return t.length>pR&&t.shift(),t}function gR(){const n={};for(const e of Bn)n[e.id]={history:{current:[],load:[]}};return n}function vR(n){return Bn.reduce((e,t)=>{var i;return e+(((i=n[t.id])==null?void 0:i.currentmA)??0)},0)}function _R(n){var i;let e=null,t=-1/0;for(const r of Bn){const s=(i=n[r.id])==null?void 0:i.tempC;s!=null&&s>t&&(t=s,e=r.label)}return e?`${e} (${t}°C)`:"—"}function xR(n){return Bn.filter(e=>{var t;return(t=n[e.id])==null?void 0:t.connected}).length}function yR(n,e){const t=[];for(const i of Bn){const r=n[i.id];r&&(r.tempC!=null&&r.tempC>Rg&&t.push({id:`temp-${i.id}`,kind:"warn",msg:`${i.label} — ${r.tempC}°C (thermal warning > ${Rg}°C)`}),r.currentmA!=null&&r.currentmA>Pg&&t.push({id:`cur-${i.id}`,kind:"warn",msg:`${i.label} — ${r.currentmA.toFixed(0)} mA (high load > ${Pg} mA)`}))}return e>Q_&&t.push({id:"total-cur",kind:"bad",msg:`System draw ${(e/1e3).toFixed(1)} A — near power limit`}),t}function Lg({values:n,color:e}){const i="scg"+te.useId().replace(/[^a-zA-Z0-9]/g,"");if(!n||n.length<2)return x.jsx("div",{style:{height:66,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-dim)",fontSize:11},children:"no data"});const r=280,s=66,o=Math.min(...n),l=Math.max(...n)-o||1,c=y=>s-5-(y-o)/l*(s-10),u=n.map((y,m)=>`${(m/(n.length-1)*r).toFixed(1)},${c(y).toFixed(1)}`),h=u.join(" "),p=`0,${s} ${h} ${r},${s}`,[f,g]=u[u.length-1].split(",").map(Number);return x.jsxs("svg",{width:"100%",height:s,viewBox:`0 0 ${r} ${s}`,preserveAspectRatio:"none",children:[x.jsx("defs",{children:x.jsxs("linearGradient",{id:i,x1:"0",y1:"0",x2:"0",y2:"1",children:[x.jsx("stop",{offset:"0%",stopColor:e,stopOpacity:.38}),x.jsx("stop",{offset:"100%",stopColor:e,stopOpacity:0})]})}),x.jsx("polygon",{points:p,fill:`url(#${i})`}),x.jsx("polyline",{points:h,fill:"none",stroke:e,strokeWidth:1.8,style:{filter:`drop-shadow(0 0 3px ${e}99)`}}),x.jsx("circle",{cx:f,cy:g,r:3,fill:e,style:{filter:`drop-shadow(0 0 5px ${e})`}})]})}function MR({current:n,target:e,color:t,size:i=100,lo:r=0,hi:s=360,onDrag:o}){const a=i,l=a/2,c=l-7,u=6+c,h=u+12,p=te.useRef(null),f=te.useRef(!1),g=te.useRef(0),y=(z,re)=>{const K=(z+90)*(Math.PI/180);return[l+re*Math.cos(K),u+re*Math.sin(K)]},m=z=>(270-(1-(z-r)/(s-r))*180)%360,[d,v]=y(270,c),[_,M]=y(90,c),[T,b]=y(0,c),E=`M ${d.toFixed(2)} ${v.toFixed(2)} A ${c} ${c} 0 0 0 ${_.toFixed(2)} ${M.toFixed(2)}`,P=n!=null?m(Math.max(r,Math.min(s,n))):null,[A,S]=P!=null?y(P,c):[null,null],D=e!=null?m(Math.max(r,Math.min(s,e))):null,[B,L]=D!=null?y(D,c):[null,null];let V=null;n!=null&&P!=null&&n>r+.5&&(V=`M ${d.toFixed(2)} ${v.toFixed(2)} A ${c} ${c} 0 0 0 ${A.toFixed(2)} ${S.toFixed(2)}`);const j=te.useCallback(z=>{if(!p.current)return null;const re=p.current.getBoundingClientRect(),K=z.clientX-re.left-l,k=z.clientY-re.top-u;let I=(Math.atan2(K,-k)*180/Math.PI+360)%360;if(I>90&&I<270)return I>180?r:s;let ne=I>=270?I-270:I+90;return Math.max(r,Math.min(s,r+ne/180*(s-r)))},[l,u,r,s]),Q=te.useCallback(z=>{if(!o)return;z.currentTarget.setPointerCapture(z.pointerId),f.current=!0;const re=j(z);re!=null&&(g.current=Date.now(),o(re))},[o,j]),$=te.useCallback(z=>{if(!f.current||!o)return;const re=Date.now();if(re-g.current<60)return;g.current=re;const K=j(z);K!=null&&o(K)},[o,j]),F=te.useCallback(()=>{f.current=!1},[]),H=!!o,W=u-c*.28;return x.jsxs("svg",{ref:p,width:a,height:h,viewBox:`0 0 ${a} ${h}`,style:{flexShrink:0,overflow:"visible",cursor:H?"crosshair":"default",touchAction:"none"},onPointerDown:H?Q:void 0,onPointerMove:H?$:void 0,onPointerUp:H?F:void 0,children:[H&&x.jsx("rect",{x:0,y:0,width:a,height:h,fill:"transparent"}),x.jsx("path",{d:E,fill:"none",stroke:"#dde6f0",strokeWidth:7,strokeLinecap:"round"}),V&&x.jsx("path",{d:V,fill:"none",stroke:t,strokeWidth:7,strokeLinecap:"round",style:{filter:`drop-shadow(0 0 4px ${t}88)`}}),x.jsx("line",{x1:(T-4).toFixed(2),y1:b.toFixed(2),x2:(T+4).toFixed(2),y2:b.toFixed(2),stroke:"#b8c8dc",strokeWidth:2.5,strokeLinecap:"round"}),D!=null&&x.jsx("circle",{cx:B.toFixed(2),cy:L.toFixed(2),r:4,fill:"rgba(255,255,255,0.9)",stroke:t,strokeWidth:2}),P!=null&&(()=>{const[z,re]=y(P,c);return x.jsx("circle",{cx:z.toFixed(2),cy:re.toFixed(2),r:H?7:5,fill:t,stroke:"white",strokeWidth:2.5,style:{filter:`drop-shadow(0 0 6px ${t})`}})})(),x.jsx("text",{x:l,y:W,textAnchor:"middle",dominantBaseline:"middle",fill:n!=null?t:"#bbc8d8",fontSize:a*.22,fontWeight:"800",fontFamily:"'Courier New', monospace",children:n!=null?Math.round(n):"—"}),x.jsx("text",{x:l,y:W+a*.155,textAnchor:"middle",fill:"#8aa0be",fontSize:a*.115,fontFamily:"inherit",fontWeight:"600",children:"DEG"})]})}function SR({alerts:n,onDismiss:e}){return n.length===0?null:x.jsx("div",{className:"sc-alerts",children:n.map(t=>x.jsxs("div",{className:`sc-alert sc-alert-${t.kind}`,children:[x.jsx("span",{className:"sc-alert-icon",children:t.kind==="bad"?"🔴":"🟡"}),x.jsx("span",{className:"sc-alert-msg",children:t.msg}),x.jsx("button",{className:"sc-alert-dismiss",onClick:()=>e(t.id),children:"×"})]},t.id))})}function ER({def:n,data:e,onCmd:t}){var P,A;const[i,r]=te.useState("180"),[s,o]=te.useState(10),[a,l]=te.useState(20),c=gr(S=>S.theme),u=c==="dark"?"#f0c040":"#e0a200",h=c==="dark"?"#5b6478":"#9aa3b5",p=(e==null?void 0:e.connected)??!1,f=(e==null?void 0:e.moving)??!1,g=(e==null?void 0:e.torque)??!1,y=(e==null?void 0:e.mode)??"—",m=n.type==="twist"?0:80,d=n.type==="twist"?360:280,v=()=>t(n.id,"pos",{angle:i,speed:s,acc:a}),_=()=>{r("180"),t(n.id,"pos",{angle:180,speed:s,acc:a})},M=S=>p?S:null,T=S=>p&&S!=null&&S>=0?S:null,b=[["Angle",M(e==null?void 0:e.currentAngle),"°",2],["Target",M(e==null?void 0:e.targetAngle),"°",2],["Speed",T(e==null?void 0:e.speed),"raw",0],["Pos",T(e==null?void 0:e.rawPos),"0-4k",0],["Load",T(e==null?void 0:e.loadAbs),"abs",0],["Current",M(e==null?void 0:e.currentmA),"mA",1],["Voltage",M(e==null?void 0:e.voltageV),"V",1],["Temp",M(e==null?void 0:e.tempC),"°C",0]],E=y==="Position"?M(e==null?void 0:e.targetAngle):null;return x.jsxs("div",{className:"sc-card",style:{"--sc-accent":u},children:[x.jsx("div",{className:"sc-card-head",children:x.jsxs("div",{className:"sc-card-head-inner",children:[x.jsx(MR,{current:M(e==null?void 0:e.currentAngle),target:E,color:u,lo:m,hi:d,onDrag:S=>t(n.id,"pos",{angle:S.toFixed(1),speed:s,acc:a})}),x.jsxs("div",{className:"sc-card-info",children:[x.jsxs("div",{className:"sc-card-title",children:[x.jsx("span",{className:"sc-joint-mono",style:{background:`${u}18`,border:`1px solid ${u}55`,color:u},children:n.label}),x.jsx("span",{className:"sc-card-name",style:{color:u},children:n.name}),x.jsx("span",{className:"sc-card-type",children:n.type})]}),x.jsxs("div",{className:"sc-badges",children:[x.jsx("span",{className:`sc-badge ${p?"sc-badge-ok":"sc-badge-bad"}`,children:p?"ONLINE":"OFFLINE"}),x.jsx("span",{className:`sc-badge ${f?"sc-badge-warn":""}`,children:f?"MOVING":"IDLE"}),x.jsx("span",{className:`sc-badge ${g?"sc-badge-ok":"sc-badge-warn"}`,children:g?"TRQ ✓":"TRQ ✗"}),x.jsx("span",{className:"sc-badge",children:y})]})]})]})}),x.jsxs("div",{className:"sc-card-body",children:[x.jsxs("div",{className:"sc-controls",children:[x.jsxs("div",{className:"sc-field",children:[x.jsx("label",{children:"Current (°)"}),x.jsx("span",{className:"sc-angle-input",style:{color:M(e==null?void 0:e.currentAngle)!=null?u:h,cursor:"default"},children:M(e==null?void 0:e.currentAngle)!=null?td(M(e==null?void 0:e.currentAngle),1):"—"})]}),x.jsxs("div",{className:"sc-field",children:[x.jsx("label",{children:"Target (°)"}),x.jsx("input",{type:"number",className:"sc-angle-input",min:"0",max:"360",step:"0.1",value:i,onChange:S=>r(S.target.value),style:{color:u}})]}),x.jsxs("div",{className:"sc-field",children:[x.jsxs("label",{children:["Speed  ",x.jsx("span",{className:"sc-slider-val",style:{color:u},children:s})]}),x.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"10",value:s,onChange:S=>o(Number(S.target.value)),style:{"--sc-accent":u}})]}),x.jsxs("div",{className:"sc-field",children:[x.jsxs("label",{children:["Accel  ",x.jsx("span",{className:"sc-slider-val",style:{color:u},children:a})]}),x.jsx("input",{type:"range",className:"sc-slider",min:"1",max:"100",value:a,onChange:S=>l(Number(S.target.value)),style:{"--sc-accent":u}})]})]}),x.jsxs("div",{className:"sc-btns",children:[x.jsx("button",{className:"sc-btn sc-btn-primary",onClick:v,children:"GO"}),n.type==="twist"&&x.jsxs(x.Fragment,{children:[x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"cw"),children:"CW"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"ccw"),children:"CCW"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"wave"),children:"WAVE"})]}),x.jsx("button",{className:"sc-btn sc-btn-danger",onClick:()=>t(n.id,"stop"),children:"■ STOP"}),x.jsx("button",{className:"sc-btn",onClick:_,children:"180°"}),x.jsx("button",{className:"sc-btn",onClick:()=>t(n.id,"torqueToggle"),children:g?"⟲ T.OFF":"⟲ T.ON"})]}),x.jsx("div",{className:"sc-stats",children:b.map(([S,D,B,L])=>x.jsxs("div",{className:"sc-stat",children:[x.jsx("div",{className:"sc-stat-k",children:S}),x.jsx("div",{className:"sc-stat-v",style:{color:D!=null?u:h},children:D!=null?td(D,L):"—"}),x.jsx("div",{className:"sc-stat-u",children:B})]},S))}),x.jsxs("div",{className:"sc-graphs",children:[x.jsxs("div",{className:"sc-graph-box",children:[x.jsxs("div",{className:"sc-graph-hdr",children:[x.jsx("span",{children:"CURRENT"}),x.jsx("span",{className:"sc-graph-val",style:{color:u},children:(e==null?void 0:e.currentmA)!=null?`${td(e.currentmA,1)} mA`:"—"})]}),x.jsx(Lg,{values:((P=e==null?void 0:e.history)==null?void 0:P.current)??[],color:u})]}),x.jsxs("div",{className:"sc-graph-box",children:[x.jsxs("div",{className:"sc-graph-hdr",children:[x.jsx("span",{children:"LOAD ABS"}),x.jsx("span",{className:"sc-graph-val",style:{color:u},children:(e==null?void 0:e.loadAbs)!=null?String(e.loadAbs):"—"})]}),x.jsx(Lg,{values:((A=e==null?void 0:e.history)==null?void 0:A.load)??[],color:u})]})]})]})]})}function wR({onCmd:n,onEstop:e}){const t=Bn.map(r=>r.id),i=(r,s={})=>t.forEach(o=>n(o,r,s));return x.jsxs("div",{className:"sc-group-strip",children:[x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:()=>i("pos",{angle:180,speed:5,acc:40}),children:"Home All"}),x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:e,children:"⚡ E-STOP"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueon"),children:"Torque ON"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:()=>i("torqueoff"),children:"Torque OFF"})]})}function TR({servos:n,onCmd:e}){const[t,i]=te.useState([]),[r,s]=te.useState(!1),[o,a]=te.useState(-1),[l,c]=te.useState(1500),u=te.useRef(!1),h=()=>{const d=Bn.map(v=>{var _;return{id:v.id,label:v.label,angle:((_=n[v.id])==null?void 0:_.currentAngle)??180}});i(v=>[...v,d])},p=async()=>{if(!(r||t.length===0)){u.current=!1,s(!0);for(let d=0;d<t.length&&!u.current;d++){a(d);for(const{id:v,angle:_}of t[d])await e(v,"pos",{angle:Number(_).toFixed(2),speed:5,acc:20});await new Promise(v=>setTimeout(v,l))}a(-1),s(!1)}},f=()=>{u.current=!0,s(!1),a(-1)},g=d=>i(v=>v.filter((_,M)=>M!==d)),y=()=>{const d=new Blob([JSON.stringify(t,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(d),download:"robo4_sequence.json"}).click()},m=d=>{var M;const v=(M=d.target.files)==null?void 0:M[0];if(!v)return;const _=new FileReader;_.onload=T=>{try{const b=JSON.parse(T.target.result);Array.isArray(b)&&i(b)}catch{}},_.readAsText(v),d.target.value=""};return x.jsxs("div",{className:"sc-seq",children:[x.jsxs("div",{className:"sc-seq-hdr",children:[x.jsx("span",{children:"⟳ Sequence Recorder"}),x.jsxs("span",{className:"sc-seq-count",children:[t.length," frame",t.length!==1?"s":""]})]}),x.jsxs("div",{className:"sc-seq-controls",children:[x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:h,children:"+ Capture"}),r?x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:f,children:"■ Stop"}):x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-primary",onClick:p,disabled:t.length===0,children:"▶ Play"}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:y,disabled:t.length===0,children:"↓ Export"}),x.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",x.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:m})]}),x.jsx("button",{className:"sc-btn sc-btn-sm sc-btn-danger",onClick:()=>i([]),disabled:t.length===0,children:"Clear"}),x.jsxs("label",{className:"sc-seq-delay-label",children:["Delay",x.jsx("input",{className:"sc-group-input",type:"number",min:"200",max:"10000",step:"100",value:l,onChange:d=>c(Number(d.target.value))}),"ms"]})]}),t.length>0&&x.jsx("div",{className:"sc-seq-frames",children:t.map((d,v)=>x.jsxs("div",{className:`sc-seq-frame ${o===v?"sc-seq-frame-active":""}`,children:[x.jsxs("span",{className:"sc-seq-frame-num",children:["#",v+1]}),d.map(({label:_,angle:M})=>x.jsxs("span",{className:"sc-seq-chip",children:[_," ",Math.round(M),"°"]},_)),x.jsx("button",{className:"sc-seq-del",onClick:()=>g(v),children:"×"})]},v))})]})}function AR({servos:n,onApply:e}){const[t,i]=te.useState(()=>{try{return JSON.parse(localStorage.getItem("sc_presets")||"[]")}catch{return[]}}),[r,s]=te.useState(""),o=h=>{i(h),localStorage.setItem("sc_presets",JSON.stringify(h))},a=()=>{const h=r.trim()||`Preset ${t.length+1}`,p=Bn.map(f=>{var g;return{id:f.id,angle:((g=n[f.id])==null?void 0:g.currentAngle)??180}});o([...t.filter(f=>f.name!==h),{name:h,snapshot:p}]),s("")},l=h=>o(t.filter(p=>p.name!==h)),c=()=>{const h=new Blob([JSON.stringify(t,null,2)],{type:"application/json"});Object.assign(document.createElement("a"),{href:URL.createObjectURL(h),download:"robo4_presets.json"}).click()},u=h=>{var g;const p=(g=h.target.files)==null?void 0:g[0];if(!p)return;const f=new FileReader;f.onload=y=>{try{const m=JSON.parse(y.target.result);Array.isArray(m)&&o([...t,...m.filter(d=>d.name&&d.snapshot)])}catch{}},f.readAsText(p),h.target.value=""};return x.jsxs("div",{className:"sc-presets",children:[x.jsxs("div",{className:"sc-presets-hdr",children:[x.jsx("span",{children:"⭐ Presets"}),x.jsx("span",{style:{color:"var(--text-dim)",fontWeight:400,fontSize:11},children:"snapshots all 6 servo angles"}),x.jsx("div",{style:{flex:1}}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:c,disabled:t.length===0,children:"↓ Export"}),x.jsxs("label",{className:"sc-btn sc-btn-sm sc-import-label",children:["↑ Import",x.jsx("input",{type:"file",accept:".json",style:{display:"none"},onChange:u})]})]}),x.jsxs("div",{className:"sc-preset-row",children:[x.jsx("input",{className:"sc-preset-name-input",placeholder:"preset name…",value:r,onChange:h=>s(h.target.value),onKeyDown:h=>h.key==="Enter"&&a()}),x.jsx("button",{className:"sc-btn sc-btn-sm",onClick:a,children:"+ Save"}),t.map(h=>x.jsxs("span",{className:"sc-preset-chip",children:[x.jsx("span",{onClick:()=>e(h.snapshot),children:h.name}),x.jsx("span",{className:"sc-preset-del",onClick:()=>l(h.name),children:"×"})]},h.name)),t.length===0&&x.jsx("span",{style:{fontSize:12,color:"var(--text-dim)"},children:"no presets yet"})]})]})}const bR={SIM:"#f59e0b",USER:"#0077dd",ESP:"#009944",POLL:"#6366f1",OFF:"#f97316",ERR:"#dc2626",SYS:"var(--text-dim)"},CR={ok:"#009944",error:"#dc2626",warn:"#d97706",info:"#0077dd",cmd:"#6366f1",queued:"#8b5cf6",offline:"#f97316"};function RR({log:n,onClear:e}){const t=te.useRef(null);return te.useEffect(()=>{var r;const i=(r=t.current)==null?void 0:r.parentElement;i&&(i.scrollTop=i.scrollHeight)},[n]),x.jsxs("div",{className:"sc-log",children:[x.jsxs("div",{className:"sc-log-hdr",children:[x.jsx("span",{children:"Debug Log"}),x.jsxs("span",{style:{display:"flex",gap:10,alignItems:"center"},children:[x.jsxs("span",{style:{color:"var(--text-dim)",fontWeight:400,fontSize:10},children:[n.length," entries · real-time"]}),x.jsx("button",{onClick:e,style:{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:5,padding:"1px 7px",fontSize:10,cursor:"pointer",color:"var(--text-dim)"},children:"CLR"})]})]}),x.jsxs("div",{className:"sc-log-body",style:{maxHeight:220},children:[n.length===0&&x.jsx("div",{style:{padding:"10px 0",color:"var(--text-dim)",fontSize:11},children:"no activity — connect to ESP32 and drag arm or press buttons"}),n.map((i,r)=>x.jsxs("div",{className:"sc-log-entry",children:[x.jsx("span",{className:"sc-log-time",children:i.time}),x.jsxs("span",{className:"sc-log-src",style:{color:bR[i.src]??"var(--text-dim)"},children:["[",i.src??"?","]"]}),x.jsx("span",{style:{color:CR[i.level??i.kind]??"var(--text-dim)",flex:1},children:i.msg})]},i.id??r)),x.jsx("div",{ref:t})]})]})}function PR(){const n=nt(U=>U.espUrl),e=nt(U=>U.pushCtrlLog),t=nt(U=>U.clearCtrlLog),i=nt(U=>U.ctrlLog),r=nt(U=>U.pendingAngles),s=nt(U=>U.consumeAngles),o=nt(U=>U.markSent),a=nt(U=>U.simSent),l=nt(U=>U.simFailed),c=nt(U=>U.simOffline),u=nt(U=>U.setConnected),h=nt(U=>U.setEspUrl),p=nt(U=>U.setServoOnlineCount),f=nt(U=>U.setAvgVoltage),g=nt(U=>U.setTotalCurrentMA),y=nt(U=>U.setOvercurrentServos),[m,d]=te.useState(n),[v,_]=te.useState(n),[M,T]=te.useState(!1),[b,E]=te.useState(null),[P,A]=te.useState("—"),[S,D]=te.useState(gR),[B,L]=te.useState(null),[V,j]=te.useState([]),Q=te.useRef(null),$=te.useRef(!1),F=te.useRef(new Set),H=te.useRef(!1),W=te.useRef(m);te.useEffect(()=>{H.current=M},[M]),te.useEffect(()=>{W.current=m},[m]),te.useCallback((U,Me="cmd",de="USER")=>{e(Me,de,U)},[e]);const z=te.useCallback(async()=>{if($.current)return;$.current=!0;const U=Date.now();try{const de=await(await fetch(`${m}/api/telemetry`,{cache:"no-store",signal:AbortSignal.timeout(8e3)})).json(),We=Date.now()-U;if(E(We),de!=null&&de.ok){H.current||e("ok","SYS",`ESP connected — ${m} (${We}ms)`),T(!0),u(!0,We),A(new Date().toLocaleTimeString()),de.wifi&&L(de.wifi);const xe=(de.servos??[]).reduce((N,C)=>N+(C.currentmA??0),0);D(N=>{const C={...N};for(const Y of de.servos??[]){const se=N[Y.id]||{history:{current:[],load:[]}};C[Y.id]={...Y,history:{current:Y.currentmA!=null?Ng(se.history.current,Y.currentmA):se.history.current,load:Y.loadAbs!=null?Ng(se.history.load,Y.loadAbs):se.history.load}}}return C});const Pe=yR(Object.fromEntries((de.servos??[]).map(N=>[N.id,N])),xe).filter(N=>!F.current.has(N.id));j(Pe);const Le=(de.servos??[]).filter(N=>N.connected).length;p(Le);const De=(de.servos??[]).filter(N=>N.connected&&N.voltageV!=null);if(De.length>0){const N=De.reduce((C,Y)=>C+Y.voltageV,0)/De.length;f(N)}Le>0&&g(xe);const rt=(de.servos??[]).filter(N=>N.connected&&N.currentmA!=null&&N.currentmA>700).map(N=>{const C=hR[N.id]??{type:"twist",num:N.id};return{id:N.id,label:N.label??`J${N.id}`,type:C.type,typeNum:C.num,currentmA:N.currentmA}});if(y(rt),Math.random()<.063){const N=(de.servos??[]).reduce((C,Y)=>Y.tempC>C?Y.tempC:C,0);e("info","POLL",`${Le}/6 online · ${We}ms · ${(xe/1e3).toFixed(2)}A · ${N}°C`)}}}catch(Me){H.current&&e("error","SYS",`ESP lost — ${Me.message}`),T(!1),u(!1,null),p(0)}finally{$.current=!1}},[m,e,u]);te.useEffect(()=>(z(),Q.current=setInterval(z,mR),()=>clearInterval(Q.current)),[z]);const re=te.useCallback(async(U,Me,de={},We="USER")=>{var De,rt;if(Me==="pos"&&de.angle!=null){const N=(De=S[U])==null?void 0:De.currentAngle;if(N!=null){const C=Math.abs(Number(de.angle)-N);if(C>=2){const Y=Math.max(6,Math.round(40/(1+C/15)));de={...de,acc:Y}}}}const Pe=`${((rt=Bn.find(N=>N.id===U))==null?void 0:rt.label)??U} → ${Me}${de.angle!==void 0?` ${Number(de.angle).toFixed(1)}°`:""}`;e("cmd",We,Pe);const Le=new URLSearchParams({servo:String(U),cmd:Me,...de});try{const N=Date.now(),C=await fetch(`${W.current}/api/command?${Le}`,{signal:AbortSignal.timeout(5e3)});if(!C.ok)throw new Error(C.statusText);e("ok","ESP",`${Pe} ✓ (${Date.now()-N}ms)`)}catch(N){e("error","ERR",`${Pe} — ${N.message}`)}},[e,S]),K=te.useCallback(async()=>{e("error","SYS","⚡ EMERGENCY STOP ALL — killing torque on all servos");try{await fetch(`${W.current}/api/command?servo=all&cmd=estop`,{signal:AbortSignal.timeout(5e3)}),e("ok","ESP","E-STOP acknowledged")}catch(U){e("error","ERR",`E-STOP failed — ${U.message}`)}},[e]),k=()=>{const U=v.trim(),Me=U.startsWith("http")?U:`http://${U}`;d(Me),h(Me),e("info","SYS",`Connecting to ${Me}`)};te.useEffect(()=>{if(!r)return;const U=r;s();const Me=Object.entries(U).sort(([xe],[Pe])=>Number(xe)-Number(Pe)).map(([xe,Pe])=>`J${xe}→${Number(Pe).toFixed(1)}°`).join(" ");if(e("queued","SIM",`Received from Page 1: ${Me}`),!H.current){e("offline","OFF",`Cannot relay — ESP offline (${W.current})`),c(Me);return}const de=new URLSearchParams({speed:"5",acc:"20"});Object.entries(U).forEach(([xe,Pe])=>de.append(xe,Number(Pe).toFixed(2))),e("cmd","ESP",`Sending batch → /api/batch?${de.toString().slice(0,60)}…`);const We=Date.now();fetch(`${W.current}/api/batch?${de}`,{signal:AbortSignal.timeout(5e3)}).then(async xe=>{if(!xe.ok)throw new Error(xe.statusText);const Pe=await xe.json(),Le=Date.now()-We;e("ok","ESP",`Batch OK — ${Pe.sent??"?"} servos updated (${Le}ms)`),a(Me),o(U)}).catch(xe=>{e("error","ERR",`Batch failed — ${xe.message}`),l(`${Me} — ${xe.message}`)})},[r]);const I=te.useCallback(U=>{e("ok","USER",`Applying preset — ${U.length} servos`);for(const Me of U)re(Me.id,"pos",{angle:Me.angle,speed:5,acc:20},"USER")},[re,e]),ne=te.useCallback(U=>{F.current.add(U),j(Me=>Me.filter(de=>de.id!==U))},[]),ee=te.useMemo(()=>vR(S),[S]),pe=te.useMemo(()=>_R(S),[S]),Ee=te.useMemo(()=>xR(S),[S]);return x.jsx("div",{className:"sc-page",children:x.jsxs("div",{className:"sc-wrap",children:[x.jsxs("div",{className:"sc-topbar",children:[x.jsxs("div",{className:"sc-brand",children:[x.jsx("p",{className:"sc-brand-title",children:"TETROBOT Servo Controller"}),x.jsx("p",{className:"sc-brand-sub",children:"6 × ST3215 Smart Servo · Real-time telemetry"})]}),x.jsx("div",{className:"sc-topbar-space"}),x.jsxs("div",{className:"sc-url-row",children:[x.jsx("input",{className:"sc-url-input",value:v,onChange:U=>_(U.target.value),onKeyDown:U=>U.key==="Enter"&&k(),placeholder:"http://nischaylap.local"}),x.jsx("button",{className:"sc-btn",onClick:k,children:"Connect"})]}),x.jsx("div",{className:"sc-topbar-sep"}),x.jsxs("div",{className:"sc-pill",children:[x.jsx("span",{className:`sc-dot ${M?"ok":"bad"}`}),M?"Live":"Disconnected"]}),x.jsxs("div",{className:"sc-pill",children:[x.jsx("span",{className:`sc-dot ${Ee===6?"ok":Ee>0?"warn":"bad"}`}),Ee," / 6"]}),b!=null&&x.jsxs("div",{className:"sc-pill",children:[b," ms"]}),x.jsx("button",{className:"sc-estop",onClick:K,children:"⚡ E-STOP ALL"})]}),x.jsx(SR,{alerts:V,onDismiss:ne}),x.jsxs("div",{className:"sc-livestrip",children:[x.jsx("span",{className:"sc-ls-label",children:"SERVOS"}),Bn.map(U=>{const Me=S[U.id],de=(Me==null?void 0:Me.connected)??!1,We=(Me==null?void 0:Me.currentAngle)!=null&&de?Math.round(Me.currentAngle)+"°":"—",xe=(Me==null?void 0:Me.currentmA)!=null&&de?Math.round(Me.currentmA)+"mA":"";return x.jsxs("div",{className:"sc-ls-servo",children:[x.jsx("span",{className:"sc-ls-dot",style:{background:de?U.color:"#888",boxShadow:de?`0 0 7px ${U.color}`:"none"}}),x.jsx("span",{className:"sc-ls-id",style:{color:U.color},children:U.label}),x.jsx("span",{className:"sc-ls-ang",children:We}),xe&&x.jsx("span",{className:"sc-ls-ma",children:xe})]},U.id)}),x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"DRAW"}),x.jsxs("span",{className:"sc-ls-v",style:{color:ee>Q_?"var(--danger)":"var(--accent)"},children:[ee.toFixed(1)," ",x.jsx("span",{className:"sc-ls-unit",children:"mA"})]})]}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"HOT"}),x.jsx("span",{className:"sc-ls-v",children:pe})]}),B&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"ESP32"}),x.jsxs("span",{className:"sc-ls-v",children:[B.ip," · ",B.hostname,".local"]})]}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"SSID"}),x.jsx("span",{className:"sc-ls-v",children:B.ssid})]})]}),x.jsx("div",{className:"sc-ls-sep"}),x.jsxs("div",{className:"sc-ls-stat",children:[x.jsx("span",{className:"sc-ls-k",children:"UPDATED"}),x.jsx("span",{className:"sc-ls-v",children:P})]})]}),x.jsx(wR,{onCmd:re,onEstop:K}),x.jsx("div",{className:"sc-grid",children:Bn.map(U=>x.jsx(ER,{def:U,data:S[U.id],onCmd:re},U.id))}),x.jsx(TR,{servos:S,onCmd:re}),x.jsx(AR,{servos:S,onApply:I}),x.jsx(RR,{log:i,onClear:t})]})})}const Ig=50;function NR(n){return Math.max(0,Math.min(360,180+n*180/Math.PI))}const LR={queued:"#8b5cf6",sent:"#059669",error:"#dc2626",offline:"#d97706"},IR={SIM:"#f59e0b",ESP:"#22c55e",ERR:"#ef4444",OFF:"#f97316"};function DR(){const n=nt(g=>g.queueAngles),e=nt(g=>g.simLog),t=nt(g=>g.connected),i=nt(g=>g.latencyMs),r=nt(g=>g.stats),s=nt(g=>g.clearSimLog),o=nt(g=>g.resetStats),a=nt(g=>g.espUrl),l=te.useRef([0,0,0,0,0,0]),c=te.useRef("R1"),u=te.useRef(null);te.useEffect(()=>ct.subscribe(y=>{l.current=y.jointAngles,c.current=y.activeRootId}),[]);const h=new Set([2]);te.useEffect(()=>{const g=setInterval(()=>{const y=Zn.indexOf(c.current),m=v=>y>v?-1:1,d={};l.current.forEach((v,_)=>{const M=_+1;let T=NR(v*m(_));h.has(M)&&(T=360-T),d[M]=T}),n(d)},Ig);return()=>clearInterval(g)},[n]),te.useEffect(()=>{const g=u.current;g&&(g.scrollTop=g.scrollHeight)},[e]);const p=e.slice(-40),f=(()=>{try{return new URL(a).hostname}catch{return a}})();return x.jsxs("div",{className:"stp-panel",children:[x.jsxs("div",{className:"stp-header",children:[x.jsxs("div",{className:"stp-header-left",children:[x.jsx("span",{className:"stp-title",children:"SIM → ESP"}),x.jsx("span",{className:`stp-dot ${t?"stp-dot-ok":"stp-dot-off"}`}),x.jsx("span",{className:"stp-conn-label",style:{color:t?"#22c55e":"#f97316"},children:t?"LIVE":"OFFLINE"})]}),x.jsxs("div",{className:"stp-header-right",children:[i!=null&&x.jsxs("span",{className:"stp-lat",children:[i," ms"]}),x.jsx("button",{className:"stp-btn",onClick:s,title:"Clear log",children:"CLR"}),x.jsx("button",{className:"stp-btn stp-btn-reset",onClick:o,title:"Reset counters",children:"RST"})]})]}),x.jsxs("div",{className:"stp-target",children:[x.jsx("span",{className:"stp-target-label",children:"TARGET"}),x.jsx("span",{className:"stp-target-url",children:f}),x.jsxs("span",{className:"stp-target-interval",children:["@",Ig,"ms"]})]}),x.jsxs("div",{className:"stp-stats",children:[x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"QUEUED"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#8b5cf6"},children:r.queued})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"SENT OK"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#22c55e"},children:r.sent})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"FAILED"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#ef4444"},children:r.failed})]}),x.jsxs("div",{className:"stp-stat",children:[x.jsx("span",{className:"stp-stat-k",children:"DROP%"}),x.jsx("span",{className:"stp-stat-v",style:{color:"#94a3b8"},children:r.queued>0?(r.failed/r.queued*100).toFixed(0):"0"})]})]}),x.jsxs("div",{className:"stp-log-hdr",children:[x.jsx("span",{children:"TRANSMISSION LOG"}),x.jsxs("span",{className:"stp-log-count",children:[e.length," entries"]})]}),x.jsxs("div",{className:"stp-log-body",ref:u,children:[p.length===0&&x.jsx("div",{className:"stp-empty",children:"drag a joint to start transmitting"}),p.map(g=>x.jsxs("div",{className:"stp-entry",children:[x.jsx("span",{className:"stp-e-time",children:g.time.slice(3)}),x.jsx("span",{className:"stp-e-src",style:{color:IR[g.src]??"#94a3b8"},children:g.src}),x.jsx("span",{className:"stp-e-msg",style:{color:LR[g.level]??"#cbd5e1"},children:g.msg})]},g.id))]})]})}function UR({isOpen:n,onClose:e,children:t}){const[i,r]=te.useState(null),[s,o]=te.useState({w:300,h:430}),[a,l]=te.useState(!1),c=te.useRef(null),u=te.useRef({w:300,h:430});te.useEffect(()=>{u.current=s},[s]),te.useEffect(()=>{n?requestAnimationFrame(()=>l(!0)):l(!1)},[n]);const h=te.useCallback(g=>{var M;if(g.button!==0)return;g.preventDefault();const y=(M=c.current)==null?void 0:M.getBoundingClientRect();if(!y)return;const m=g.clientX-y.left,d=g.clientY-y.top;document.body.style.cursor="grabbing",document.body.style.userSelect="none";const v=T=>{r({x:Math.max(0,Math.min(window.innerWidth-80,T.clientX-m)),y:Math.max(0,Math.min(window.innerHeight-40,T.clientY-d))})},_=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",v),document.removeEventListener("mouseup",_)};document.addEventListener("mousemove",v),document.addEventListener("mouseup",_)},[]),p=te.useCallback(g=>{if(g.button!==0)return;g.preventDefault(),g.stopPropagation();const{w:y,h:m}=u.current,d=g.clientX,v=g.clientY;document.body.style.cursor="nwse-resize",document.body.style.userSelect="none";const _=T=>{o({w:Math.max(240,y+(T.clientX-d)),h:Math.max(280,m+(T.clientY-v))})},M=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",_),document.removeEventListener("mouseup",M)};document.addEventListener("mousemove",_),document.addEventListener("mouseup",M)},[]),f=i?{left:i.x,top:i.y,right:"auto"}:{};return x.jsxs("div",{ref:c,className:`conn-window${a?" conn-window--open":""}`,style:{width:s.w,height:s.h,...f},children:[x.jsxs("div",{className:"conn-window-header",onMouseDown:h,children:[x.jsxs("svg",{width:"14",height:"9",viewBox:"0 0 14 9",fill:"none",className:"conn-drag-dots",children:[x.jsx("circle",{cx:"2",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"7",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"12",cy:"2",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"2",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"7",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"}),x.jsx("circle",{cx:"12",cy:"7",r:"1.4",fill:"currentColor",opacity:"0.45"})]}),x.jsx("span",{className:"conn-window-title",children:"SIM → ESP"}),x.jsx("button",{className:"conn-close-btn",onMouseDown:g=>g.stopPropagation(),onClick:e,title:"Close",children:"✕"})]}),x.jsx("div",{className:"conn-window-body",children:t}),x.jsx("div",{className:"conn-resize-handle",onMouseDown:p})]})}const FR=2600,OR=750,kR="TETROBOT".split(""),zR=[0,1,2,3,4,5];function BR({onDone:n}){const[e,t]=te.useState(!1),i=te.useRef(!1),r=()=>{i.current||(i.current=!0,t(!0),setTimeout(n,OR))};return te.useEffect(()=>{const s=setTimeout(r,FR);return()=>clearTimeout(s)},[]),x.jsxs("div",{className:`intro${e?" intro--exit":""}`,onClick:r,children:[x.jsx("div",{className:"intro-glow"}),x.jsx("div",{className:"intro-grid"}),x.jsxs("div",{className:"intro-stage",children:[x.jsx("div",{className:"intro-modules",children:zR.map(s=>x.jsx("span",{className:"intro-cube",style:{"--i":s}},s))}),x.jsx("h1",{className:"intro-word","aria-label":"TETROBOT",children:kR.map((s,o)=>x.jsx("span",{className:"intro-letter",style:{"--i":o},children:s},o))}),x.jsx("div",{className:"intro-underline"}),x.jsxs("div",{className:"intro-tagline",children:[x.jsx("span",{className:"intro-sub",children:"MODULAR ROBOTICS"}),x.jsx("span",{className:"intro-dot"}),x.jsx("span",{className:"intro-by",children:"BY NISCHAY SAI"})]})]}),x.jsx("div",{className:"intro-skip",children:"click to skip"})]})}function HR(){var t;if(!window.confirm("Start a new project? The current scene will be cleared (saved files are untouched)."))return;const n={format:"tetrobot-project",version:1,scene:{activeModuleId:"module-0",nextId:1,modules:[{id:"module-0",label:"Module 1",angles:[0,0,0,0,0,0],activeRootId:"R1",position:{x:0,y:0,z:0},quaternion:{x:0,y:0,z:0,w:1},mode:"horizontal"}],welds:[]}},e=(t=oe.loadScene)==null?void 0:t.call(oe,n);if(e&&!e.ok){alert(e.error);return}zn.getState().setDoc(null,null)}async function VR(){const n=await l_(Jf(),"tetrobot.nischay");n&&zn.getState().setDoc(n.name,n.handle)}async function jR(){var n;try{const e=await c_();if(!e)return;const t=(n=oe.loadScene)==null?void 0:n.call(oe,e.data);if(t&&!t.ok){alert(`Could not open project: ${t.error}`);return}zn.getState().setDoc(e.name,e.handle)}catch(e){alert(`Could not open file: ${e.message}`)}}function ul(n){var t;const e=(t=oe.exportModel)==null?void 0:t.call(oe,n);e&&!e.ok&&alert(e.error)}const dl={sep:!0};function GR({items:n,onClose:e}){const[t,i]=te.useState(null);return x.jsx("div",{className:"menu-dropdown",children:n.map((r,s)=>r.sep?x.jsx("div",{className:"menu-sep"},s):r.submenu?x.jsxs("div",{className:"menu-item menu-item--sub",onMouseEnter:()=>i(s),onMouseLeave:()=>i(null),children:[x.jsx("span",{children:r.label}),x.jsx("span",{className:"menu-arrow",children:"▸"}),t===s&&x.jsx("div",{className:"menu-subdropdown",children:r.submenu.map((o,a)=>x.jsx("button",{className:"menu-item",onClick:()=>{e(),o.onClick()},children:o.label},a))})]},s):x.jsxs("button",{className:"menu-item",disabled:r.disabled,onClick:()=>{e(),r.onClick()},children:[x.jsx("span",{children:r.label}),r.shortcut&&x.jsx("span",{className:"menu-shortcut",children:r.shortcut})]},s))})}function WR({onToggleConn:n}){const[e,t]=te.useState(null),i=te.useRef(null),r=$o(f=>f.canUndo),s=$o(f=>f.canRedo),o=gr(f=>f.theme),a=Re(f=>f.modules),l=Re(f=>f.connectMode),c=Re(f=>f.disconnectMode),u=Re(f=>f.deleteMode);te.useEffect(()=>{if(!e)return;const f=y=>{i.current&&!i.current.contains(y.target)&&t(null)},g=y=>{y.key==="Escape"&&t(null)};return document.addEventListener("mousedown",f),document.addEventListener("keydown",g),()=>{document.removeEventListener("mousedown",f),document.removeEventListener("keydown",g)}},[e]);const h=()=>Re.getState(),p={File:[{label:"New Project",onClick:HR},{label:"Open Project…",onClick:jR},{label:"Save Project…",onClick:VR},dl,{label:"Export",submenu:[{label:"OBJ",onClick:()=>ul("obj")},{label:"STL",onClick:()=>ul("stl")},{label:"STEP",onClick:()=>ul("step")},{label:"GLB",onClick:()=>ul("glb")}]}],Edit:[{label:"Undo",shortcut:"Ctrl+Z",disabled:!r,onClick:()=>{var f;return(f=oe.undo)==null?void 0:f.call(oe)}},{label:"Redo",shortcut:"Ctrl+Y",disabled:!s,onClick:()=>{var f;return(f=oe.redo)==null?void 0:f.call(oe)}},dl,{label:"Add Module",onClick:()=>{var f;return h().addModule((f=oe.computeFreeSpawn)==null?void 0:f.call(oe))}},{label:l?"Cancel Connect":"Connect Modules",onClick:()=>{const f=h();f.disconnectMode&&f.setDisconnectMode(!1),f.setConnectMode(!f.connectMode)}},{label:c?"Cancel Disconnect":"Disconnect Modules",onClick:()=>{const f=h();f.connectMode&&f.setConnectMode(!1),f.setDisconnectMode(!f.disconnectMode)}},{label:"Disconnect All",onClick:()=>{var f;return(f=oe.disconnectAll)==null?void 0:f.call(oe)}},{label:u?"Cancel Delete":"Delete Module",disabled:a.length<=1,onClick:()=>h().setDeleteMode(!h().deleteMode)},dl,{label:"Home (active)",onClick:()=>ct.getState().homeArm()},{label:"Home All",onClick:()=>{var f;return(f=oe.homeAll)==null?void 0:f.call(oe)}},{label:"E-Stop",onClick:()=>{var f;return(f=oe.estop)==null?void 0:f.call(oe)}}],View:[{label:"Fit View",onClick:()=>{var f;return(f=oe.fitCamera)==null?void 0:f.call(oe)}},{label:"Connection Panel",onClick:()=>n==null?void 0:n()},dl,{label:o==="dark"?"Light Theme":"Dark Theme",onClick:()=>gr.getState().toggleTheme()}],Help:[{label:"Keyboard Shortcuts",onClick:()=>alert(`Shortcuts
────────────
Ctrl+Z              Undo
Ctrl+Y / Ctrl+Shift+Z   Redo

Viewport
────────────
Drag a rod          Move (IK)
Click a rod         Set as root
Scroll              Zoom
Right-drag          Orbit
Middle / Shift-drag Pan`)},{label:"About TETROBOT",onClick:()=>alert(`TETROBOT — Modular Robotics
by Nischay Sai`)}]};return x.jsxs("div",{className:"menubar",ref:i,children:[x.jsx("div",{className:"menubar-menus",children:Object.keys(p).map(f=>x.jsxs("div",{className:"menu",children:[x.jsx("button",{className:`menu-label${e===f?" menu-label--open":""}`,onClick:()=>t(e===f?null:f),onMouseEnter:()=>{e&&t(f)},children:f}),e===f&&x.jsx(GR,{items:p[f],onClose:()=>t(null)})]},f))}),x.jsxs("div",{className:"menubar-tools",children:[x.jsx("button",{className:"menubar-icon",disabled:!r,title:"Undo (Ctrl+Z)",onClick:()=>{var f;return(f=oe.undo)==null?void 0:f.call(oe)},children:x.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 18 18",fill:"none",children:[x.jsx("path",{d:"M6 4L2.5 7.5 6 11",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round"}),x.jsx("path",{d:"M2.5 7.5H11a4.5 4.5 0 014.5 4.5v1",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"})]})}),x.jsx("button",{className:"menubar-icon",disabled:!s,title:"Redo (Ctrl+Y)",onClick:()=>{var f;return(f=oe.redo)==null?void 0:f.call(oe)},children:x.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 18 18",fill:"none",children:[x.jsx("path",{d:"M12 4l3.5 3.5L12 11",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round"}),x.jsx("path",{d:"M15.5 7.5H7A4.5 4.5 0 002.5 12v1",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"})]})})]})]})}function XR(){const n=zn(i=>i.name),e=zn(i=>i.status),t=n??"untitled";return x.jsxs("div",{className:"doc-indicator",title:n?`Auto-saving changes to ${n}`:"Not saved to a file yet — changes are kept locally. Use SAVE PROJECT to create a file.",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",className:"doc-icon",children:x.jsx("path",{d:"M3 2h7l3 3v9H3V2z",stroke:"currentColor",strokeWidth:"1.4",strokeLinejoin:"round"})}),x.jsx("span",{className:"doc-name",children:t}),n&&e==="saving"&&x.jsxs("span",{className:"doc-status doc-saving",children:[x.jsx("svg",{width:"11",height:"11",viewBox:"0 0 16 16",fill:"none",className:"doc-spin",children:x.jsx("path",{d:"M8 1.5a6.5 6.5 0 106.5 6.5",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round"})}),"saving…"]}),n&&e==="saved"&&x.jsxs("span",{className:"doc-status doc-saved",children:[x.jsx("svg",{width:"11",height:"11",viewBox:"0 0 16 16",fill:"none",children:x.jsx("path",{d:"M3 8.5l3.5 3.5L13 4.5",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),"saved"]}),!n&&x.jsx("span",{className:"doc-status doc-dim",children:"local only"})]})}function $R(){const n=gr(i=>i.theme),e=gr(i=>i.toggleTheme),t=n==="dark";return x.jsx("button",{className:"theme-toggle",onClick:e,title:`Switch to ${t?"light":"dark"} theme`,"aria-label":"Toggle theme",children:t?x.jsxs("svg",{width:"17",height:"17",viewBox:"0 0 20 20",fill:"none",children:[x.jsx("circle",{cx:"10",cy:"10",r:"3.6",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("path",{d:"M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M3.9 3.9l1.6 1.6M14.5 14.5l1.6 1.6M16.1 3.9l-1.6 1.6M5.5 14.5l-1.6 1.6",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round"})]}):x.jsx("svg",{width:"17",height:"17",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M16.5 11.8A7 7 0 018.2 3.5 7 7 0 1016.5 11.8z",stroke:"currentColor",strokeWidth:"1.6",strokeLinejoin:"round",fill:"none"})})})}function YR(){const n=ct(e=>e.homeArm);return x.jsxs("div",{className:"sim-toolbar",children:[x.jsxs("button",{className:"sim-tool-btn",onClick:n,title:"Home the active module",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"})}),"HOME"]}),x.jsxs("button",{className:"sim-tool-btn",onClick:()=>{var e;return(e=oe.homeAll)==null?void 0:e.call(oe)},title:"Home every module",children:[x.jsx("svg",{width:"13",height:"13",viewBox:"0 0 20 20",fill:"none",children:x.jsx("path",{d:"M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H6a1 1 0 01-1-1V9.5z",stroke:"currentColor",strokeWidth:"1.8",strokeLinejoin:"round",fill:"none"})}),"HOME ALL"]}),x.jsxs("button",{className:"sim-tool-btn",onClick:()=>{var e;return(e=oe.disconnectAll)==null?void 0:e.call(oe)},title:"Disconnect all modules and lay them out fresh",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"3.5",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.5"}),x.jsx("circle",{cx:"12.5",cy:"8",r:"2",stroke:"currentColor",strokeWidth:"1.5"}),x.jsx("path",{d:"M6 6l4-2.5M6 10l4 2.5",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]}),"DISCONNECT ALL"]}),x.jsxs("button",{className:"sim-tool-btn sim-tool-btn--danger",onClick:()=>{var e;return(e=oe.estop)==null?void 0:e.call(oe)},title:"Stop all motion now",children:[x.jsxs("svg",{width:"13",height:"13",viewBox:"0 0 16 16",fill:"none",children:[x.jsx("circle",{cx:"8",cy:"8",r:"6",stroke:"currentColor",strokeWidth:"1.6"}),x.jsx("rect",{x:"5.5",y:"5.5",width:"5",height:"5",rx:"1",fill:"currentColor"})]}),"E-STOP"]})]})}function qR(){const n=ct(i=>i.collision),t=ct(i=>i.joints).some(i=>i.limitHit);return!n&&!t?null:x.jsxs("div",{className:"workspace-notification",children:[n&&x.jsxs("div",{className:"workspace-notif-row workspace-notif--collision",children:[x.jsx("span",{className:"workspace-notif-dot"}),"COLLISION — movement blocked"]}),t&&!n&&x.jsxs("div",{className:"workspace-notif-row workspace-notif--limit",children:[x.jsx("span",{className:"workspace-notif-dot"}),"JOINT LIMIT reached"]})]})}function KR({pct:n,color:e,width:t=28,height:i=13}){const s=t-2.5,o=1.8,a=Math.max(0,(s-o*2)*n/100),l=(i-i*.45)/2;return x.jsxs("svg",{width:t,height:i,viewBox:`0 0 ${t} ${i}`,style:{flexShrink:0},children:[x.jsx("rect",{x:.75,y:.75,width:s-1.5,height:i-1.5,rx:2,fill:"none",stroke:e,strokeWidth:1.5}),x.jsx("rect",{x:s,y:l,width:2.5,height:i*.45,rx:1,fill:e}),a>0&&x.jsx("rect",{x:o,y:o,width:a,height:i-o*2,rx:1,fill:e})]})}function ZR(){const n=nt(r=>r.servoOnlineCount),e=nt(r=>r.avgVoltage);if(n===0||e==null)return null;const t=Math.max(0,Math.min(100,(e-10.8)/(12.6-10.8)*100)),i=t<10?"#ef4444":t<30?"#f97316":"#22c55e";return x.jsxs("div",{className:"app-status-chip",title:`Battery: ${e.toFixed(2)} V avg · ${t.toFixed(0)}%`,children:[x.jsx(KR,{pct:t,color:i}),x.jsxs("span",{style:{fontSize:13,fontWeight:700,color:i,transition:"color 0.4s",letterSpacing:"0.03em"},children:[t.toFixed(0),"%"]}),x.jsxs("span",{style:{fontSize:12,fontWeight:600,color:"var(--text)",marginLeft:1},children:[e.toFixed(1),"V"]})]})}function JR(){const n=nt(o=>o.servoOnlineCount),e=nt(o=>o.totalCurrentMA);if(n===0||e==null)return null;const t=250*n,i=450*n,r=e>i?"#ef4444":e>t?"#f97316":"#22c55e",s=e>=1e3?`${(e/1e3).toFixed(2)} A`:`${Math.round(e)} mA`;return x.jsxs("div",{className:"app-status-chip",title:`Total current draw: ${e.toFixed(0)} mA · orange>${t}mA · red>${i}mA`,children:[x.jsx("svg",{width:"11",height:"17",viewBox:"0 0 11 17",fill:"none",style:{flexShrink:0},children:x.jsx("path",{d:"M6.5 1L1 9.5H5.5L4.5 16L10 7.5H5.5L6.5 1Z",fill:r})}),x.jsx("span",{style:{fontSize:13,fontWeight:700,color:r,transition:"color 0.4s",letterSpacing:"0.03em"},children:s})]})}function QR(){const n=nt(t=>t.overcurrentServos);if(!n||n.length===0)return null;const e=n.map(t=>`${t.label} ${t.type?t.type.toUpperCase()+" "+t.typeNum:""} (${Math.round(t.currentmA)}mA)`).join("  ·  ");return x.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",background:"#cc000022",border:"2px solid #cc0000",borderRadius:999,whiteSpace:"nowrap",animation:"oc-pulse 0.75s ease-in-out infinite alternate",boxShadow:"0 0 14px #cc000044"},children:[x.jsxs("svg",{width:"17",height:"17",viewBox:"0 0 13 13",fill:"none",style:{flexShrink:0},children:[x.jsx("path",{d:"M6.5 1L12 11.5H1L6.5 1Z",stroke:"#cc0000",strokeWidth:"2",fill:"#cc000022"}),x.jsx("line",{x1:"6.5",y1:"4.5",x2:"6.5",y2:"8.5",stroke:"#cc0000",strokeWidth:"1.8",strokeLinecap:"round"}),x.jsx("circle",{cx:"6.5",cy:"10.2",r:"0.9",fill:"#cc0000"})]}),x.jsx("span",{style:{fontSize:14,fontWeight:900,color:"#cc0000",letterSpacing:"0.08em",textTransform:"uppercase"},children:"Overcurrent"}),x.jsx("span",{style:{fontSize:14,fontWeight:800,color:"#cc0000",letterSpacing:"0.03em"},children:e})]})}function eP({page:n,setPage:e}){const t=nt(o=>o.connected),i=nt(o=>o.servoOnlineCount);let r,s;return t?i===0?(r="#f59e0b",s="No servos"):i<6?(r="#f59e0b",s=`${i}/6 live`):(r="#22c55e",s="All OK"):(r="#ef4444",s="Offline"),x.jsxs("header",{className:"app-header",children:[x.jsxs("div",{className:"app-header-brand",children:[x.jsx("span",{className:"app-logo",children:"TETROBOT"}),x.jsxs("span",{className:"app-logo-tagline",children:[x.jsx("span",{className:"app-logo-sub",children:"modular robotics"}),x.jsx("span",{className:"app-logo-byline",children:"by nischay sai"})]})]}),x.jsx("div",{className:"app-header-sep"}),x.jsxs("nav",{className:"app-nav",children:[x.jsxs("button",{className:`app-nav-tab ${n==="sim"?"active":""}`,onClick:()=>e("sim"),children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("path",{d:"M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"7",r:"1.5",fill:"currentColor"})]}),"Simulator"]}),x.jsxs("button",{className:`app-nav-tab ${n==="servo"?"active":""}`,onClick:()=>e("servo"),children:[x.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[x.jsx("circle",{cx:"7",cy:"7",r:"3",stroke:"currentColor",strokeWidth:"1.4",fill:"none"}),x.jsx("circle",{cx:"7",cy:"7",r:"1",fill:"currentColor"}),x.jsx("path",{d:"M7 1V3M7 11V13M1 7H3M11 7H13M2.5 2.5L4 4M10 10L11.5 11.5M11.5 2.5L10 4M4 10L2.5 11.5",stroke:"currentColor",strokeWidth:"1.4",strokeLinecap:"round"})]}),"Servo Control"]})]}),x.jsx("div",{className:"app-header-sep"}),x.jsx(XR,{}),x.jsx("div",{className:"app-header-space"}),x.jsxs("div",{className:"app-header-right",children:[x.jsx(QR,{}),x.jsx(ZR,{}),x.jsx(JR,{}),x.jsxs("div",{className:"app-status-chip",title:`ESP32-C3: ${s}`,children:[x.jsx("span",{style:{width:10,height:10,borderRadius:"50%",display:"inline-block",flexShrink:0,background:r,boxShadow:`0 0 7px ${r}`,transition:"background 0.4s, box-shadow 0.4s"}}),x.jsx("span",{children:"ESP32-C3"}),x.jsxs("span",{style:{fontSize:12,color:r,marginLeft:2,fontWeight:700,transition:"color 0.4s"},children:["· ",s]})]}),x.jsx("div",{className:"app-status-chip app-status-chip-mono",children:"6 × ST3215"}),x.jsx($R,{})]})]})}function tP({page:n}){return x.jsxs("footer",{className:"app-footer",children:[x.jsx("span",{className:"app-footer-brand",children:"ROBO4"}),x.jsx("span",{className:"app-footer-sep"}),x.jsx("span",{children:"Modular Robotics Platform"}),x.jsx("span",{className:"app-footer-sep"}),x.jsx("span",{children:"6 × ST3215 · ESP32-C3"}),x.jsx("div",{className:"app-footer-space"}),x.jsx("span",{className:`app-footer-page-pill ${n==="sim"?"active":""}`,style:{cursor:"pointer"},children:"◈ Simulator"}),x.jsx("span",{className:`app-footer-page-pill ${n==="servo"?"active":""}`,style:{cursor:"pointer"},children:"⚙ Servo Control"})]})}const nP=200,Dg=340;function iP(){const[n,e]=te.useState("sim"),[t,i]=te.useState(!1),[r,s]=te.useState(Dg),[o,a]=te.useState(!0),l=gr(f=>f.theme);te.useEffect(()=>{document.documentElement.setAttribute("data-theme",l)},[l]);const c=zn(f=>f.name);te.useEffect(()=>{document.title=`TETROBOT — ${c??"untitled"}`},[c]);const u=te.useRef(Dg);u.current=r;const h=te.useCallback(f=>{if(f.button!==0)return;f.preventDefault();const g=f.clientX,y=u.current,m=Math.floor(window.innerWidth/2);document.body.style.cursor="col-resize",document.body.style.userSelect="none";const d=_=>{const M=Math.max(nP,Math.min(m,y+(_.clientX-g)));u.current=M,s(M)},v=()=>{document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",d),document.removeEventListener("mouseup",v)};document.addEventListener("mousemove",d),document.addEventListener("mouseup",v)},[]),p=te.useCallback(()=>i(f=>!f),[]);return te.useEffect(()=>{const f=g=>{var d,v,_,M;if(!(g.ctrlKey||g.metaKey))return;const y=(d=g.target)==null?void 0:d.tagName;if(y==="INPUT"||y==="TEXTAREA"||(v=g.target)!=null&&v.isContentEditable)return;const m=g.key.toLowerCase();m==="z"&&!g.shiftKey?(g.preventDefault(),(_=oe.undo)==null||_.call(oe)):(m==="y"||m==="z"&&g.shiftKey)&&(g.preventDefault(),(M=oe.redo)==null||M.call(oe))};return window.addEventListener("keydown",f),()=>window.removeEventListener("keydown",f)},[]),x.jsxs("div",{className:"app-shell",children:[o&&x.jsx(BR,{onDone:()=>a(!1)}),x.jsx(WR,{onToggleConn:p}),x.jsx(eP,{page:n,setPage:e}),x.jsxs("main",{className:"app-main",children:[x.jsxs("div",{className:"app-root",style:n!=="sim"?{visibility:"hidden",pointerEvents:"none",position:"absolute",inset:0}:{},children:[x.jsx(pS,{style:{width:r}}),x.jsx("div",{className:"panel-resize-handle",onMouseDown:h}),x.jsxs("div",{className:"canvas-wrapper",children:[x.jsx(rR,{}),x.jsx(YR,{}),x.jsx(qR,{}),x.jsxs("div",{className:"top-right-cluster",children:[x.jsx(cR,{}),x.jsx(uR,{isConnOpen:t,onConnToggle:p})]}),x.jsx(sR,{})]})]}),x.jsx("div",{className:"app-servo-wrap",style:n!=="servo"?{display:"none"}:{},children:x.jsx(PR,{})})]}),x.jsx(tP,{page:n}),x.jsx(UR,{isOpen:t,onClose:()=>i(!1),children:x.jsx(DR,{})})]})}Yv(document.getElementById("root")).render(x.jsx(te.StrictMode,{children:x.jsx(iP,{})}));

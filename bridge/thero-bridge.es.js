//#region node_modules/penpal/dist/penpal.mjs
var e = class extends Error {
	code;
	constructor(e, t) {
		super(t), this.name = "PenpalError", this.code = e;
	}
}, t = (t) => ({
	name: t.name,
	message: t.message,
	stack: t.stack,
	penpalCode: t instanceof e ? t.code : void 0
}), n = ({ name: t, message: n, stack: r, penpalCode: i }) => {
	let a = i ? new e(i, n) : Error(n);
	return a.name = t, a.stack = r, a;
}, r = class {
	value;
	transferables;
	constructor(e, t) {
		this.value = e, this.transferables = t?.transferables;
	}
}, i = "penpal", a = (e) => typeof e == "object" && !!e, o = (e) => typeof e == "function", s = (e) => a(e) && e.namespace === "penpal", c = (e) => e.type === "SYN", l = (e) => e.type === "ACK1", u = (e) => e.type === "ACK2", d = (e) => e.type === "CALL", f = (e) => e.type === "REPLY", p = (e) => e.type === "DESTROY", m = (e, t) => {
	let n = e.reduce((e, t) => {
		if (a(e) && Object.hasOwn(e, t)) return e[t];
	}, t);
	return o(n) ? n : void 0;
}, h = (e) => e.join("."), g = (e, n, r) => ({
	namespace: i,
	channel: e,
	type: "REPLY",
	callId: n,
	isError: !0,
	...r instanceof Error ? {
		value: t(r),
		isSerializedErrorInstance: !0
	} : { value: r }
}), _ = (t, n, a, o) => {
	let s = !1, c = async (c) => {
		if (s || !d(c)) return;
		o?.(`Received ${h(c.methodPath)}() call`, c);
		let { methodPath: l, args: u, id: f } = c, p, _;
		try {
			let t = m(l, n);
			if (!t) throw new e("METHOD_NOT_FOUND", `Method \`${h(l)}\` is not found.`);
			let o = await t(...u);
			o instanceof r && (_ = o.transferables, o = await o.value), p = {
				namespace: i,
				channel: a,
				type: "REPLY",
				callId: f,
				value: o
			};
		} catch (e) {
			p = g(a, f, e);
		}
		if (!s) try {
			o?.(`Sending ${h(l)}() reply`, p), t.sendMessage(p, _);
		} catch (e) {
			throw e.name === "DataCloneError" && (p = g(a, f, e), o?.(`Sending ${h(l)}() reply`, p), t.sendMessage(p)), e;
		}
	}, l = (e) => {
		c(e).catch((e) => {
			console.error(e);
		});
	};
	return t.addMessageHandler(l), () => {
		s = !0, t.removeMessageHandler(l);
	};
}, v = crypto.randomUUID?.bind(crypto) ?? (() => [
	,
	,
	,
	,
].fill(0).map(() => Math.floor(Math.random() * (2 ** 53 - 1)).toString(16)).join("-")), y = class {
	transferables;
	timeout;
	constructor(e) {
		this.transferables = e?.transferables, this.timeout = e?.timeout;
	}
}, b = /* @__PURE__ */ new Set([
	"apply",
	"call",
	"bind"
]), x = (e, t, n = []) => new Proxy(n.length ? () => {} : Object.create(null), {
	get(r, i) {
		if (i !== "then") return n.length && b.has(i) ? Reflect.get(r, i) : x(e, t, [...n, i]);
	},
	apply(t, r, i) {
		return e(n, i);
	}
}), S = (t) => new e("CONNECTION_DESTROYED", `Method call ${h(t)}() failed due to destroyed connection`), C = (t, r, a) => {
	let o = !1, s = /* @__PURE__ */ new Map(), c = (e) => {
		if (!f(e)) return;
		let { callId: t, value: r, isError: i, isSerializedErrorInstance: o } = e, c = s.get(t);
		c && (s.delete(t), clearTimeout(c.timeoutId), a?.(`Received ${h(c.methodPath)}() reply`, e), i ? c.reject(o ? n(r) : r) : c.resolve(r));
	};
	return t.addMessageHandler(c), {
		remoteProxy: x((n, c) => {
			if (o) throw S(n);
			let l = v(), u = c[c.length - 1], d = u instanceof y, { timeout: f, transferables: p } = d ? u : {}, m = d ? c.slice(0, -1) : c;
			return new Promise((o, c) => {
				let u = f === void 0 ? void 0 : globalThis.setTimeout(() => {
					s.delete(l), c(new e("METHOD_CALL_TIMEOUT", `Method call ${h(n)}() timed out after ${f}ms`));
				}, f);
				s.set(l, {
					methodPath: n,
					resolve: o,
					reject: c,
					timeoutId: u
				});
				try {
					let e = {
						namespace: i,
						channel: r,
						type: "CALL",
						id: l,
						methodPath: n,
						args: m
					};
					a?.(`Sending ${h(n)}() call`, e), t.sendMessage(e, p);
				} catch (t) {
					s.delete(l), clearTimeout(u), c(new e("TRANSMISSION_FAILED", t.message));
				}
			});
		}, a),
		destroy: () => {
			o = !0, t.removeMessageHandler(c);
			for (let { methodPath: e, reject: t, timeoutId: n } of s.values()) clearTimeout(n), t(S(e));
			s.clear();
		}
	};
}, w = ({ messenger: t, methods: n, timeout: r, channel: a, log: o }) => {
	let s = v(), d, f = [], p = !1, m = !1, { promise: h, resolve: g, reject: y } = Promise.withResolvers(), b = r === void 0 ? void 0 : setTimeout(() => {
		S(new e("CONNECTION_TIMEOUT", `Connection timed out after ${r}ms`));
	}, r), x = () => {
		clearTimeout(b);
		for (let e of f.splice(0)) e();
	}, S = (e) => {
		m || (m = !0, x(), y(e));
	}, w = () => {
		S(new e("CONNECTION_DESTROYED", "Connection destroyed"));
	}, T = () => {
		if (m || p) return;
		f.push(_(t, n, a, o));
		let { remoteProxy: e, destroy: r } = C(t, a, o);
		f.push(r), clearTimeout(b), p = !0, g(e);
	}, E = (n) => {
		if (m) return !1;
		o?.(`Sending handshake ${n.type}`, n);
		try {
			return t.sendMessage(n), !0;
		} catch (t) {
			return S(new e("TRANSMISSION_FAILED", t.message)), !1;
		}
	}, D = () => E({
		namespace: i,
		type: "SYN",
		channel: a,
		participantId: s
	}), O = (e) => {
		o?.("Received handshake SYN", e), e.participantId !== d && (d = e.participantId, D() && s > d && E({
			namespace: "penpal",
			channel: a,
			type: "ACK1"
		}));
	}, k = (e) => {
		o?.("Received handshake ACK1", e), E({
			namespace: "penpal",
			channel: a,
			type: "ACK2"
		}) && T();
	}, A = (e) => {
		o?.("Received handshake ACK2", e), T();
	}, j = (e) => {
		m || (c(e) ? O(e) : l(e) ? k(e) : u(e) && A(e));
	};
	return t.addMessageHandler(j), f.push(() => t.removeMessageHandler(j)), D(), {
		promise: h,
		destroy: w
	};
}, T = (e) => {
	let t = !1, n;
	return (...r) => (t || (t = !0, n = e(...r)), n);
}, E = /* @__PURE__ */ new WeakSet(), D = () => new e("CONNECTION_DESTROYED", "Connection destroyed"), O = ({ messenger: t, methods: n = {}, timeout: r, channel: a, log: o }) => {
	if (!t) throw new e("INVALID_ARGUMENT", "messenger must be defined");
	if (E.has(t)) throw new e("INVALID_ARGUMENT", "A messenger can only be used for a single connection");
	E.add(t);
	let c = Promise.withResolvers(), l = !1, u, d = () => {
		let e = {
			namespace: i,
			channel: a,
			type: "DESTROY"
		};
		try {
			t.sendMessage(e);
		} catch {}
	}, f = T((e, n) => {
		l = !0, n && d(), t.destroy(), u?.(), c.reject(e), o?.("Connection destroyed");
	}), m = (e) => s(e) && e.channel === a;
	return (async () => {
		try {
			t.initialize({
				log: o,
				validateReceivedMessage: m
			}), t.addMessageHandler((e) => {
				p(e) && f(D(), !1);
			});
			let e = w({
				messenger: t,
				methods: n,
				timeout: r,
				channel: a,
				log: o
			});
			u = e.destroy;
			let i = await e.promise;
			if (l) {
				e.destroy();
				return;
			}
			c.resolve(i);
		} catch (e) {
			f(e, !0);
		}
	})(), {
		promise: c.promise,
		destroy: () => {
			f(D(), !0);
		}
	};
}, k = class {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a = /* @__PURE__ */ new Set();
	#o;
	constructor({ remoteWindow: t, allowedOrigins: n }) {
		if (!t) throw new e("INVALID_ARGUMENT", "remoteWindow must be defined");
		this.#e = t, this.#t = n?.length ? n : [window.origin];
	}
	initialize = ({ log: e, validateReceivedMessage: t }) => {
		this.#n = e, this.#r = t, window.addEventListener("message", this.#d);
	};
	sendMessage = (t, n) => {
		if (c(t)) {
			let e = this.#c(t);
			this.#e.postMessage(t, {
				targetOrigin: e,
				...n === void 0 ? {} : { transfer: n }
			});
			return;
		}
		if (l(t)) {
			let e = this.#c(t);
			this.#e.postMessage(t, {
				targetOrigin: e,
				...n === void 0 ? {} : { transfer: n }
			});
			return;
		}
		if (u(t)) {
			let { port1: e, port2: r } = new MessageChannel();
			this.#u(e);
			let i = [r, ...n || []], a = this.#c(t);
			try {
				this.#e.postMessage(t, {
					targetOrigin: a,
					transfer: i
				});
			} catch (e) {
				throw this.#l(), r.close(), e;
			}
			return;
		}
		if (this.#o) {
			this.#o.postMessage(t, { ...n === void 0 ? {} : { transfer: n } });
			return;
		}
		throw new e("TRANSMISSION_FAILED", "Cannot send message because the MessagePort is not connected");
	};
	addMessageHandler = (e) => {
		this.#a.add(e);
	};
	removeMessageHandler = (e) => {
		this.#a.delete(e);
	};
	destroy = () => {
		window.removeEventListener("message", this.#d), this.#l(), this.#a.clear();
	};
	#s = (e) => this.#t.some((t) => t instanceof RegExp ? new RegExp(t).test(e) : t === e || t === "*");
	#c = (t) => {
		if (c(t)) return "*";
		if (!this.#i) throw new e("TRANSMISSION_FAILED", "Cannot send message because the remote origin is not established");
		return this.#i === "null" && this.#t.includes("*") ? "*" : this.#i;
	};
	#l = () => {
		this.#o?.removeEventListener("message", this.#f), this.#o?.close(), this.#o = void 0;
	};
	#u = (e) => {
		this.#l(), this.#o = e, this.#o.addEventListener("message", this.#f), this.#o.start();
	};
	#d = ({ source: e, origin: t, ports: n, data: r }) => {
		if (e === this.#e && this.#r?.(r)) {
			if (!this.#s(t)) {
				this.#n?.(`Received a message from origin \`${t}\` which did not match allowed origins \`[${this.#t.join(", ")}]\``);
				return;
			}
			if (c(r) && (this.#l(), this.#i = t), u(r)) {
				let e = n[0];
				if (!e) {
					this.#n?.("Ignoring ACK2 because it did not include a MessagePort");
					return;
				}
				this.#u(e);
			}
			for (let e of this.#a) e(r);
		}
	};
	#f = ({ data: e }) => {
		if (this.#r?.(e)) for (let t of this.#a) t(e);
	};
};
//#endregion
//#region src/services/intacct/utils/session.ts
function A() {
	let e = window._sess;
	if (!e) throw Error("Missing Intacct session: window._sess is not set.");
	return e;
}
function j() {
	return !!window._sess;
}
//#endregion
//#region src/services/intacct/utils/debug.ts
function M(e) {
	return `controlid=${e.match(/<function[^>]*controlid="([^"]*)"/i)?.[1] ?? "?"} object=${e.match(/<object>([^<]*)<\/object>/i)?.[1] ?? "?"}`;
}
//#endregion
//#region src/bridge/child.ts
function N() {
	return F().promise;
}
var P = null;
function F() {
	return P ||= O({
		messenger: new k({
			remoteWindow: window.parent,
			allowedOrigins: ["*"]
		}),
		methods: {},
		timeout: 1e4
	}), P;
}
function I() {
	try {
		return window.parent !== window;
	} catch {
		return !0;
	}
}
async function L(e) {
	alert(`[child>parent] ${M(e)}`);
	try {
		let t = await (await F().promise).request(e, new y({ timeout: 15e3 })), n = t?.text ?? "", r = new DOMParser().parseFromString(n, "text/xml");
		return alert(`[child<parent] status=${t?.status ?? "?"} chars=${n.length}`), {
			text: n,
			xml: r,
			status: t?.status ?? void 0
		};
	} catch (e) {
		throw alert(`[child>parent] FAILED: ${e.message}`), P?.destroy(), P = null, e;
	}
}
var R = "preload-fix-1";
function z() {
	if (typeof window > "u" || !I()) return alert("[child] standalone page — direct Intacct"), null;
	if (j()) return alert("[child] embedded with own session — direct Intacct"), null;
	alert(`[child] build=${R} embedded without session — bridge mode`), F().promise.then(() => alert("[child] bridge CONNECTED to parent"), (e) => alert(`[child] bridge CONNECT FAILED: ${e.message}`));
	let e = !1;
	return { uninstall() {
		e || (e = !0, P?.destroy(), P = null);
	} };
}
//#endregion
//#region src/services/intacct/utils/constant.ts
var B = "https://www-p04.intacct.com/ia/xml/ajaxgw.phtml";
//#endregion
//#region src/services/intacct/utils/request.ts
function V(e) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
  <operation>
    <authentication><sessionid>${A()}</sessionid></authentication>
    <content>${e}</content>
  </operation>
</request>`;
}
//#endregion
//#region src/services/intacct/index.ts
async function H(e) {
	if (!j()) return alert("[intacct] no local session — via bridge"), L(e);
	let t = A(), n = await (await fetch(`${B}?.sess=${encodeURIComponent(t)}`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ xmlrequest: V(e) }),
		credentials: "include"
	})).text(), r = new DOMParser().parseFromString(n, "text/xml"), i = r.querySelector("result > status")?.textContent ?? void 0, a = new Blob([n], { type: "text/plain;charset=utf-8" }), o = URL.createObjectURL(a), s = document.createElement("a");
	return s.href = o, s.download = `error--${Date.now()}.txt`, document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(o), {
		text: n,
		xml: r,
		status: i
	};
}
//#endregion
//#region src/services/intacct/action/taskorder.ts
async function U(e) {
	let t = document.forms.namedItem("theForm");
	if (!(t instanceof HTMLFormElement)) throw Error("Form name=\"theForm\" not found");
	let n = new FormData(t);
	for (let [t, r] of Object.entries(e)) n.set(t, r);
	let r = await fetch(t.action, {
		method: "POST",
		body: n,
		credentials: "include"
	}), i = await r.text();
	return alert(`[taskorder create] status=${r.status} chars=${i.length} redirected=${r.redirected}`), r.redirected && r.url && window.location.assign(r.url), i;
}
//#endregion
//#region src/bridge/parent.ts
function W(e = "intacct") {
	alert("initParentBridge---" + A());
	let t = document.getElementById(e);
	if (!t) throw Error(`Parent bridge: no iframe found with id "${e}".`);
	let n = t.contentWindow;
	if (!n) throw Error("Parent bridge: iframe has no contentWindow yet.");
	let r = O({
		messenger: new k({
			remoteWindow: n,
			allowedOrigins: ["*"]
		}),
		methods: {
			async request(e) {
				alert(`[parent] request ${M(String(e ?? ""))}`);
				try {
					let { text: t, status: n } = await H(String(e ?? ""));
					return alert(`[parent] response status=${n ?? "?"} chars=${t.length}`), {
						text: t,
						status: n ?? null
					};
				} catch (e) {
					throw alert(`[parent] FAILED: ${e.message}`), e;
				}
			},
			async submitForm(e) {
				alert("[parent] submitForm — fill + submit parent form");
				try {
					let t = await U(e?.values ?? {});
					return alert(`[parent] submitForm done chars=${t.length}`), { text: t };
				} catch (e) {
					throw alert(`[parent] submitForm FAILED: ${e.message}`), e;
				}
			}
		}
	});
	return r.promise.then(() => alert("[parent] bridge CONNECTED to child"), (e) => alert(`[parent] bridge CONNECT FAILED: ${e.message}`)), { destroy: () => r.destroy() };
}
//#endregion
export { R as BUILD_ID, N as getParentApi, W as initParentBridge, z as installBridgeChild, L as intacctViaBridge, I as isEmbedded };

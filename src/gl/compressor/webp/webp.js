let MyCache = new Map()
const getWebPMod = async () => {
    let Module = {}
    let moduleOverrides = {}
    let key
    for (key in Module) {
        if (Module.hasOwnProperty(key)) {
            moduleOverrides[key] = Module[key]
        }
    }
    Module['arguments'] = []
    Module['thisProgram'] = './this.program'
    Module['quit'] = function (status, toThrow) {
        throw toThrow
    }
    Module['preRun'] = []
    Module['postRun'] = []
    let ENVIRONMENT_IS_WEB = false
    let ENVIRONMENT_IS_WORKER = false
    let ENVIRONMENT_IS_NODE = false
    let ENVIRONMENT_IS_SHELL = false
    ENVIRONMENT_IS_WEB = typeof window === 'object'
    ENVIRONMENT_IS_WORKER = typeof importScripts === 'function'
    ENVIRONMENT_IS_NODE =
        typeof process === 'object' &&
        typeof require === 'function' &&
        !ENVIRONMENT_IS_WEB &&
        !ENVIRONMENT_IS_WORKER
    ENVIRONMENT_IS_SHELL =
        !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER
    let scriptDirectory = ''
    function locateFile(path) {
        if (Module['locateFile']) {
            return Module['locateFile'](path, scriptDirectory)
        } else {
            return scriptDirectory + path
        }
    }

    /*
if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + '/'
  let nodeFS
  let nodePath
  Module['read'] = function shell_read(filename, binary) {
    let ret
    if (!nodeFS) nodeFS = require('fs')
    if (!nodePath) nodePath = require('path')
    filename = nodePath['normalize'](filename)
    ret = nodeFS['readFileSync'](filename)
    return binary ? ret : ret.toString()
  }
  Module['readBinary'] = function readBinary(filename) {
    let ret = Module['read'](filename, true)
    if (!ret.buffer) {
      ret = new Uint8Array(ret)
    }
    assert(ret.buffer)
    return ret
  }
  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/')
  }
  Module['arguments'] = process['argv'].slice(2)
  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }
  process['on']('uncaughtException', function (ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex
    }
  })
  process['on']('unhandledRejection', abort)
  Module['quit'] = function (status) {
    process['exit'](status)
  }
  Module['inspect'] = function () {
    return '[Emscripten Module object]'
  }
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    Module['read'] = function shell_read(f) {
      return read(f)
    }
  }
  Module['readBinary'] = function readBinary(f) {
    let data
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f))
    }
    data = read(f, 'binary')
    assert(typeof data === 'object')
    return data
  }
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments
  }
  if (typeof quit === 'function') {
    Module['quit'] = function (status) {
      quit(status)
    }
  }
} else


 */
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) {
            scriptDirectory = self.location.href
        } else if (document.currentScript) {
            scriptDirectory = document.currentScript.src
        }
        if (scriptDirectory.indexOf('blob:') !== 0) {
            scriptDirectory = scriptDirectory.substr(
                0,
                scriptDirectory.lastIndexOf('/') + 1
            )
        } else {
            scriptDirectory = ''
        }
        Module['read'] = function shell_read(url) {
            let xhr = new XMLHttpRequest()
            xhr.open('GET', url, false)
            xhr.send(null)
            return xhr.responseText
        }
        if (ENVIRONMENT_IS_WORKER) {
            Module['readBinary'] = function readBinary(url) {
                let xhr = new XMLHttpRequest()
                xhr.open('GET', url, false)
                xhr.responseType = 'arraybuffer'
                xhr.send(null)
                return new Uint8Array(xhr.response)
            }
        }
        Module['readAsync'] = function readAsync(url, onload, onerror) {
            let xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.responseType = 'arraybuffer'
            xhr.onload = function xhr_onload() {
                if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
                    onload(xhr.response)
                    return
                }
                onerror()
            }
            xhr.onerror = onerror
            xhr.send(null)
        }
        Module['setWindowTitle'] = function (title) {
            document.title = title
        }
    } else {
    }
    let out =
        Module['print'] ||
        (typeof console !== 'undefined'
            ? console.log.bind(console)
            : typeof print !== 'undefined'
            ? print
            : null)
    let err =
        Module['printErr'] ||
        (typeof printErr !== 'undefined'
            ? printErr
            : (typeof console !== 'undefined' && console.warn.bind(console)) ||
              out)
    for (key in moduleOverrides) {
        if (moduleOverrides.hasOwnProperty(key)) {
            Module[key] = moduleOverrides[key]
        }
    }
    moduleOverrides = undefined
    let asm2wasmImports = {
        'f64-rem': function (x, y) {
            return x % y
        },
        debugger: function () {
            debugger
        },
    }
    let functionPointers = new Array(0)
    let GLOBAL_BASE = 1024
    let ABORT = false
    let EXITSTATUS = 0
    function assert(condition, text) {
        if (!condition) {
            abort('Assertion failed: ' + text)
        }
    }
    function getCFunc(ident) {
        let func = Module['_' + ident]
        assert(
            func,
            'Cannot call unknown function ' +
                ident +
                ', make sure it is exported'
        )
        return func
    }
    let JSfuncs = {
        stackSave: function () {
            stackSave()
        },
        stackRestore: function () {
            stackRestore()
        },
        arrayToC: function (arr) {
            let ret = stackAlloc(arr.length)
            writeArrayToMemory(arr, ret)
            return ret
        },
        stringToC: function (str) {
            let ret = 0
            if (str !== null && str !== undefined && str !== 0) {
                let len = (str.length << 2) + 1
                ret = stackAlloc(len)
                stringToUTF8(str, ret, len)
            }
            return ret
        },
    }
    let toC = { string: JSfuncs['stringToC'], array: JSfuncs['arrayToC'] }
    function ccall(ident, returnType, argTypes, args, opts) {
        function convertReturnValue(ret) {
            if (returnType === 'string') return Pointer_stringify(ret)
            if (returnType === 'boolean') return Boolean(ret)
            return ret
        }
        let func = getCFunc(ident)
        let cArgs = []
        let stack = 0
        if (args) {
            for (let i = 0; i < args.length; i++) {
                let converter = toC[argTypes[i]]
                if (converter) {
                    if (stack === 0) stack = stackSave()
                    cArgs[i] = converter(args[i])
                } else {
                    cArgs[i] = args[i]
                }
            }
        }
        let ret = func.apply(null, cArgs)
        ret = convertReturnValue(ret)
        if (stack !== 0) stackRestore(stack)
        return ret
    }
    function cwrap(ident, returnType, argTypes, opts) {
        argTypes = argTypes || []
        let numericArgs = argTypes.every(function (type) {
            return type === 'number'
        })
        let numericRet = returnType !== 'string'
        if (numericRet && numericArgs && !opts) {
            return getCFunc(ident)
        }
        return function () {
            return ccall(ident, returnType, argTypes, arguments, opts)
        }
    }
    function Pointer_stringify(ptr, length) {
        if (length === 0 || !ptr) return ''
        let hasUtf = 0
        let t
        let i = 0
        while (1) {
            t = HEAPU8[(ptr + i) >> 0]
            hasUtf |= t
            if (t == 0 && !length) break
            i++
            if (length && i == length) break
        }
        if (!length) length = i
        let ret = ''
        if (hasUtf < 128) {
            let MAX_CHUNK = 1024
            let curr
            while (length > 0) {
                curr = String.fromCharCode.apply(
                    String,
                    HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK))
                )
                ret = ret ? ret + curr : curr
                ptr += MAX_CHUNK
                length -= MAX_CHUNK
            }
            return ret
        }
        return UTF8ToString(ptr)
    }
    let UTF8Decoder =
        typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined
    function UTF8ArrayToString(u8Array, idx) {
        let endPtr = idx
        while (u8Array[endPtr]) ++endPtr
        if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
            return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
        } else {
            let str = ''
            while (1) {
                let u0 = u8Array[idx++]
                if (!u0) return str
                if (!(u0 & 128)) {
                    str += String.fromCharCode(u0)
                    continue
                }
                let u1 = u8Array[idx++] & 63
                if ((u0 & 224) == 192) {
                    str += String.fromCharCode(((u0 & 31) << 6) | u1)
                    continue
                }
                let u2 = u8Array[idx++] & 63
                if ((u0 & 240) == 224) {
                    u0 = ((u0 & 15) << 12) | (u1 << 6) | u2
                } else {
                    u0 =
                        ((u0 & 7) << 18) |
                        (u1 << 12) |
                        (u2 << 6) |
                        (u8Array[idx++] & 63)
                }
                if (u0 < 65536) {
                    str += String.fromCharCode(u0)
                } else {
                    let ch = u0 - 65536
                    str += String.fromCharCode(
                        55296 | (ch >> 10),
                        56320 | (ch & 1023)
                    )
                }
            }
        }
    }
    function UTF8ToString(ptr) {
        return UTF8ArrayToString(HEAPU8, ptr)
    }
    function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
        if (!(maxBytesToWrite > 0)) return 0
        let startIdx = outIdx
        let endIdx = outIdx + maxBytesToWrite - 1
        for (let i = 0; i < str.length; ++i) {
            let u = str.charCodeAt(i)
            if (u >= 55296 && u <= 57343) {
                let u1 = str.charCodeAt(++i)
                u = (65536 + ((u & 1023) << 10)) | (u1 & 1023)
            }
            if (u <= 127) {
                if (outIdx >= endIdx) break
                outU8Array[outIdx++] = u
            } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx) break
                outU8Array[outIdx++] = 192 | (u >> 6)
                outU8Array[outIdx++] = 128 | (u & 63)
            } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx) break
                outU8Array[outIdx++] = 224 | (u >> 12)
                outU8Array[outIdx++] = 128 | ((u >> 6) & 63)
                outU8Array[outIdx++] = 128 | (u & 63)
            } else {
                if (outIdx + 3 >= endIdx) break
                outU8Array[outIdx++] = 240 | (u >> 18)
                outU8Array[outIdx++] = 128 | ((u >> 12) & 63)
                outU8Array[outIdx++] = 128 | ((u >> 6) & 63)
                outU8Array[outIdx++] = 128 | (u & 63)
            }
        }
        outU8Array[outIdx] = 0
        return outIdx - startIdx
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
    }
    let UTF16Decoder =
        typeof TextDecoder !== 'undefined'
            ? new TextDecoder('utf-16le')
            : undefined
    let WASM_PAGE_SIZE = 65536
    function alignUp(x, multiple) {
        if (x % multiple > 0) {
            x += multiple - (x % multiple)
        }
        return x
    }
    let buffer,
        HEAP8,
        HEAPU8,
        HEAP16,
        HEAPU16,
        HEAP32,
        HEAPU32,
        HEAPF32,
        HEAPF64
    function updateGlobalBuffer(buf) {
        Module['buffer'] = buffer = buf
    }
    function updateGlobalBufferViews() {
        Module['HEAP8'] = HEAP8 = new Int8Array(buffer)
        Module['HEAP16'] = HEAP16 = new Int16Array(buffer)
        Module['HEAP32'] = HEAP32 = new Int32Array(buffer)
        Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer)
        Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer)
        Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer)
        Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer)
        Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer)
    }
    let STATIC_BASE = 1024,
        DYNAMIC_BASE = 5282720,
        DYNAMICTOP_PTR = 39584
    let byteLength
    try {
        byteLength = Function.prototype.call.bind(
            Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')
                .get
        )
        byteLength(new ArrayBuffer(4))
    } catch (e) {
        byteLength = function (buffer) {
            return buffer.byteLength
        }
    }
    let TOTAL_STACK = 5242880
    let TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216
    if (TOTAL_MEMORY < TOTAL_STACK)
        err(
            'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' +
                TOTAL_MEMORY +
                '! (TOTAL_STACK=' +
                TOTAL_STACK +
                ')'
        )
    if (Module['buffer']) {
        buffer = Module['buffer']
    } else {
        if (
            typeof WebAssembly === 'object' &&
            typeof WebAssembly.Memory === 'function'
        ) {
            Module['wasmMemory'] = new WebAssembly.Memory({
                initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
            })
            buffer = Module['wasmMemory'].buffer
        } else {
            buffer = new ArrayBuffer(TOTAL_MEMORY)
        }
        Module['buffer'] = buffer
    }
    updateGlobalBufferViews()
    HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE
    function callRuntimeCallbacks(callbacks) {
        while (callbacks.length > 0) {
            let callback = callbacks.shift()
            if (typeof callback == 'function') {
                callback()
                continue
            }
            let func = callback.func
            if (typeof func === 'number') {
                if (callback.arg === undefined) {
                    Module['dynCall_v'](func)
                } else {
                    Module['dynCall_vi'](func, callback.arg)
                }
            } else {
                func(callback.arg === undefined ? null : callback.arg)
            }
        }
    }
    let __ATPRERUN__ = []
    let __ATINIT__ = []
    let __ATMAIN__ = []
    let __ATPOSTRUN__ = []
    let runtimeInitialized = false
    function preRun() {
        if (Module['preRun']) {
            if (typeof Module['preRun'] == 'function')
                Module['preRun'] = [Module['preRun']]
            while (Module['preRun'].length) {
                addOnPreRun(Module['preRun'].shift())
            }
        }
        callRuntimeCallbacks(__ATPRERUN__)
    }
    function ensureInitRuntime() {
        if (runtimeInitialized) return
        runtimeInitialized = true
        callRuntimeCallbacks(__ATINIT__)
    }
    function preMain() {
        callRuntimeCallbacks(__ATMAIN__)
    }
    function postRun() {
        if (Module['postRun']) {
            if (typeof Module['postRun'] == 'function')
                Module['postRun'] = [Module['postRun']]
            while (Module['postRun'].length) {
                addOnPostRun(Module['postRun'].shift())
            }
        }
        callRuntimeCallbacks(__ATPOSTRUN__)
    }
    function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb)
    }
    function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb)
    }
    function writeArrayToMemory(array, buffer) {
        HEAP8.set(array, buffer)
    }
    let runDependencies = 0
    let runDependencyWatcher = null
    let dependenciesFulfilled = null
    function addRunDependency(id) {
        runDependencies++
        if (Module['monitorRunDependencies']) {
            Module['monitorRunDependencies'](runDependencies)
        }
    }
    function removeRunDependency(id) {
        runDependencies--
        if (Module['monitorRunDependencies']) {
            Module['monitorRunDependencies'](runDependencies)
        }
        if (runDependencies == 0) {
            if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher)
                runDependencyWatcher = null
            }
            if (dependenciesFulfilled) {
                let callback = dependenciesFulfilled
                dependenciesFulfilled = null
                callback()
            }
        }
    }
    Module['preloadedImages'] = {}
    Module['preloadedAudios'] = {}
    let dataURIPrefix = 'data:application/octet-stream;base64,'
    function isDataURI(filename) {
        return String.prototype.startsWith
            ? filename.startsWith(dataURIPrefix)
            : filename.indexOf(dataURIPrefix) === 0
    }
    if (!MyCache.has('blobWASM')) {
        MyCache.set(
            'blobWASM',
            fetch('/webp/webp.wasm').then((e) => e.blob())
        )
    }

    let blob = await MyCache.get('blobWASM')
    let wasmBinaryFile = URL.createObjectURL(blob)
    if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile)
    }
    function mergeMemory(newBuffer) {
        let oldBuffer = Module['buffer']
        if (newBuffer.byteLength < oldBuffer.byteLength) {
            err(
                'the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here'
            )
        }
        let oldView = new Int8Array(oldBuffer)
        let newView = new Int8Array(newBuffer)
        newView.set(oldView)
        updateGlobalBuffer(newBuffer)
        updateGlobalBufferViews()
    }
    function getBinary() {
        try {
            if (Module['wasmBinary']) {
                return new Uint8Array(Module['wasmBinary'])
            }
            if (Module['readBinary']) {
                return Module['readBinary'](wasmBinaryFile)
            } else {
                throw 'both async and sync fetching of the wasm failed'
            }
        } catch (err) {
            abort(err)
        }
    }
    function getBinaryPromise() {
        // if (
        //   !Module['wasmBinary'] &&
        //   (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
        //   typeof fetch === 'function'
        // ) {

        //   return
        //   // return fetch(wasmBinaryFile, { credentials: 'same-origin' })
        //   //   .then(function (response) {
        //   //     if (!response['ok']) {
        //   //       throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
        //   //     }
        //   //     return response['arrayBuffer']()
        //   //   })
        //   //   .catch(function () {
        //   //     return getBinary()
        //   //   })
        // }
        return new Promise(function (resolve, reject) {
            // let url = 'data:application/octet-stream;base64,' + base64
            // let result = dataURItoBlob(url)
            //getBinary()
            //result.buffer
            // fetch(`/webp/webp.wasm`, { credentials: 'same-origin' })
            //   .then((r) => {
            //     return r.arrayBuffer()
            //   })
            //   .then(resolve)
            // Module['wasmBinary'] = result
            // .then((v) => {
            //   Module['wasmBinary'] = v.buffer
            //   resolve(new Uint8Array(v.buffer))
            // })
        })
    }
    function createWasm(env) {
        if (typeof WebAssembly !== 'object') {
            err('no native wasm support detected')
            return false
        }
        if (!(Module['wasmMemory'] instanceof WebAssembly.Memory)) {
            err('no native wasm Memory in use')
            return false
        }
        env['memory'] = Module['wasmMemory']
        let info = {
            global: { NaN: NaN, Infinity: Infinity },
            'global.Math': Math,
            env: env,
            asm2wasm: asm2wasmImports,
            parent: Module,
        }
        function receiveInstance(instance, module) {
            let exports = instance.exports
            if (exports.memory) mergeMemory(exports.memory)
            Module['asm'] = exports
            removeRunDependency('wasm-instantiate')
        }
        addRunDependency('wasm-instantiate')
        if (Module['instantiateWasm']) {
            try {
                return Module['instantiateWasm'](info, receiveInstance)
            } catch (e) {
                err('Module.instantiateWasm callback failed with error: ' + e)
                return false
            }
        }
        function receiveInstantiatedSource(output) {
            receiveInstance(output['instance'])
        }
        function instantiateArrayBuffer(receiver) {
            getBinaryPromise()
                .then(function (binary) {
                    return WebAssembly.instantiate(binary, info)
                })
                .then(receiver, function (reason) {
                    err('failed to asynchronously prepare wasm: ' + reason)
                    abort(reason)
                })
        }
        if (
            !Module['wasmBinary'] &&
            typeof WebAssembly.instantiateStreaming === 'function' &&
            !isDataURI(wasmBinaryFile) &&
            typeof fetch === 'function'
        ) {
            WebAssembly.instantiateStreaming(
                fetch(wasmBinaryFile, { credentials: 'same-origin' }),
                info
            ).then(receiveInstantiatedSource, function (reason) {
                err('wasm streaming compile failed: ' + reason)
                err('falling back to ArrayBuffer instantiation')
                instantiateArrayBuffer(receiveInstantiatedSource)
            })
        } else {
            instantiateArrayBuffer(receiveInstantiatedSource)
        }
        return {}
    }
    let wasmReallocBuffer = function (size) {
        let PAGE_MULTIPLE = 65536
        size = alignUp(size, PAGE_MULTIPLE)
        let old = Module['buffer']
        let oldSize = old.byteLength
        try {
            let result = Module['wasmMemory'].grow((size - oldSize) / 65536)
            if (result !== (-1 | 0)) {
                return (Module['buffer'] = Module['wasmMemory'].buffer)
            } else {
                return null
            }
        } catch (e) {
            return null
        }
    }
    Module['reallocBuffer'] = function (size) {
        return wasmReallocBuffer(size)
    }
    Module['asm'] = function (global, env, providedBuffer) {
        if (!env['table']) {
            let TABLE_SIZE = Module['wasmTableSize']
            let MAX_TABLE_SIZE = Module['wasmMaxTableSize']
            if (
                typeof WebAssembly === 'object' &&
                typeof WebAssembly.Table === 'function'
            ) {
                if (MAX_TABLE_SIZE !== undefined) {
                    env['table'] = new WebAssembly.Table({
                        initial: TABLE_SIZE,
                        maximum: MAX_TABLE_SIZE,
                        element: 'anyfunc',
                    })
                } else {
                    env['table'] = new WebAssembly.Table({
                        initial: TABLE_SIZE,
                        element: 'anyfunc',
                    })
                }
            } else {
                env['table'] = new Array(TABLE_SIZE)
            }
            Module['wasmTable'] = env['table']
        }
        if (!env['__memory_base']) {
            env['__memory_base'] = Module['STATIC_BASE']
        }
        if (!env['__table_base']) {
            env['__table_base'] = 0
        }
        let exports = createWasm(env)
        return exports
    }
    STATIC_BASE = GLOBAL_BASE
    let STATIC_BUMP = 38816
    Module['STATIC_BASE'] = STATIC_BASE
    Module['STATIC_BUMP'] = STATIC_BUMP
    function ___assert_fail(condition, filename, line, func) {
        abort(
            'Assertion failed: ' +
                UTF8ToString(condition) +
                ', at: ' +
                [
                    filename ? UTF8ToString(filename) : 'unknown filename',
                    line,
                    func ? UTF8ToString(func) : 'unknown function',
                ]
        )
    }
    function _emscripten_get_heap_size() {
        return TOTAL_MEMORY
    }
    function _emscripten_resize_heap(requestedSize) {
        let oldSize = _emscripten_get_heap_size()
        let PAGE_MULTIPLE = 65536
        let LIMIT = 2147483648 - PAGE_MULTIPLE
        if (requestedSize > LIMIT) {
            return false
        }
        let MIN_TOTAL_MEMORY = 16777216
        let newSize = Math.max(oldSize, MIN_TOTAL_MEMORY)
        while (newSize < requestedSize) {
            if (newSize <= 536870912) {
                newSize = alignUp(2 * newSize, PAGE_MULTIPLE)
            } else {
                newSize = Math.min(
                    alignUp((3 * newSize + 2147483648) / 4, PAGE_MULTIPLE),
                    LIMIT
                )
            }
        }
        let replacement = Module['reallocBuffer'](newSize)
        if (!replacement || replacement.byteLength != newSize) {
            return false
        }
        updateGlobalBuffer(replacement)
        updateGlobalBufferViews()
        TOTAL_MEMORY = newSize
        HEAPU32[DYNAMICTOP_PTR >> 2] = requestedSize
        return true
    }
    function _llvm_log10_f32(x) {
        return Math.log(x) / Math.LN10
    }
    function _llvm_log10_f64() {
        return _llvm_log10_f32.apply(null, arguments)
    }
    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src + num), dest)
    }
    function ___setErrNo(value) {
        if (Module['___errno_location'])
            HEAP32[Module['___errno_location']() >> 2] = value
        return value
    }
    Module['wasmTableSize'] = 176
    Module['wasmMaxTableSize'] = 176
    let asmGlobalArg = {}
    Module.asmLibraryArg = {
        c: abort,
        b: ___assert_fail,
        e: ___setErrNo,
        h: _emscripten_get_heap_size,
        g: _emscripten_memcpy_big,
        f: _emscripten_resize_heap,
        d: _llvm_log10_f64,
        a: DYNAMICTOP_PTR,
    }
    let asm = Module['asm'](asmGlobalArg, Module.asmLibraryArg, buffer)
    Module['asm'] = asm
    let ___errno_location = (Module['___errno_location'] = function () {
        return Module['asm']['i'].apply(null, arguments)
    })
    let _create_buffer = (Module['_create_buffer'] = function () {
        return Module['asm']['j'].apply(null, arguments)
    })
    let _destroy_buffer = (Module['_destroy_buffer'] = function () {
        return Module['asm']['k'].apply(null, arguments)
    })
    let _encode = (Module['_encode'] = function () {
        return Module['asm']['l'].apply(null, arguments)
    })
    let _free_result = (Module['_free_result'] = function () {
        return Module['asm']['m'].apply(null, arguments)
    })
    let _get_result_pointer = (Module['_get_result_pointer'] = function () {
        return Module['asm']['n'].apply(null, arguments)
    })
    let _get_result_size = (Module['_get_result_size'] = function () {
        return Module['asm']['o'].apply(null, arguments)
    })
    let _version = (Module['_version'] = function () {
        return Module['asm']['p'].apply(null, arguments)
    })
    let stackAlloc = (Module['stackAlloc'] = function () {
        return Module['asm']['r'].apply(null, arguments)
    })
    let stackRestore = (Module['stackRestore'] = function () {
        return Module['asm']['s'].apply(null, arguments)
    })
    let stackSave = (Module['stackSave'] = function () {
        return Module['asm']['t'].apply(null, arguments)
    })
    let dynCall_vi = (Module['dynCall_vi'] = function () {
        return Module['asm']['q'].apply(null, arguments)
    })
    Module['asm'] = asm
    Module['cwrap'] = cwrap
    function ExitStatus(status) {
        this.name = 'ExitStatus'
        this.message = 'Program terminated with exit(' + status + ')'
        this.status = status
    }
    ExitStatus.prototype = new Error()
    ExitStatus.prototype.constructor = ExitStatus
    dependenciesFulfilled = function runCaller() {
        if (!Module['calledRun']) run()
        if (!Module['calledRun']) dependenciesFulfilled = runCaller
    }
    function run(args) {
        args = args || Module['arguments']
        if (runDependencies > 0) {
            return
        }
        preRun()
        if (runDependencies > 0) return
        if (Module['calledRun']) return
        function doRun() {
            if (Module['calledRun']) return
            Module['calledRun'] = true
            if (ABORT) return
            ensureInitRuntime()
            preMain()
            if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']()
            postRun()
        }
        if (Module['setStatus']) {
            Module['setStatus']('Running...')
            setTimeout(function () {
                setTimeout(function () {
                    Module['setStatus']('')
                }, 1)
                doRun()
            }, 1)
        } else {
            doRun()
        }
    }
    Module['run'] = run
    function abort(what) {
        if (Module['onAbort']) {
            Module['onAbort'](what)
        }
        if (what !== undefined) {
            out(what)
            err(what)
            what = JSON.stringify(what)
        } else {
            what = ''
        }
        ABORT = true
        EXITSTATUS = 1
        throw 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.'
    }
    Module['abort'] = abort
    if (Module['preInit']) {
        if (typeof Module['preInit'] == 'function')
            Module['preInit'] = [Module['preInit']]
        while (Module['preInit'].length > 0) {
            Module['preInit'].pop()()
        }
    }
    Module['noExitRuntime'] = true
    // function dataURItoBlob(dataURI) {
    //   // convert base64/URLEncoded data component to raw binary data held in a string
    //   let byteString
    //   if (dataURI.split(',')[0].indexOf('base64') >= 0)
    //     byteString = atob(dataURI.split(',')[1])
    //   else byteString = unescape(dataURI.split(',')[1])

    //   // separate out the mime component
    //   let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    //   // write the bytes of the string to a typed array
    //   let ia = new Uint8Array(byteString.length)
    //   for (let i = 0; i < byteString.length; i++) {
    //     ia[i] = byteString.charCodeAt(i)
    //   }

    //   return ia
    // }

    run()

    let WebPMod = Module

    const WasmWebp = {
        memoizedModuleAPI: {},
        api: () => {
            if (!Object.keys(WasmWebp.memoizedModuleAPI).length) {
                WasmWebp.memoizedModuleAPI = {
                    version: WebPMod.cwrap('version', 'number', []),
                    createBuffer: WebPMod.cwrap('create_buffer', 'number', [
                        'number',
                        'number',
                    ]),
                    destroyBuffer: WebPMod.cwrap('destroy_buffer', '', [
                        'number',
                    ]),
                    encode: WebPMod.cwrap('encode', '', [
                        'number',
                        'number',
                        'number',
                        'number',
                    ]),
                    getResultPointer: WebPMod.cwrap(
                        'get_result_pointer',
                        'number',
                        []
                    ),
                    getResultSize: WebPMod.cwrap(
                        'get_result_size',
                        'number',
                        []
                    ),
                    freeResult: WebPMod.cwrap('free_result', '', ['number']),
                }
            }
            return WasmWebp.memoizedModuleAPI
        },

        getVersion: () => {
            const v = WasmWebp.api().version()
            return `${(v >> 16) & 0xff}.${(v >> 8) & 0xff}.${v & 0xff}`
        },

        encode: (imageURL, quality = 100, onStartEncoding = () => {}) => {
            console.log(imageURL)
            return new Promise(async (resolve, reject) => {
                let imagePointer = null
                let resultPointer = null

                if (!MyCache.has('blobPromPic' + imageURL)) {
                    MyCache.set(
                        'blobPromPic' + imageURL,
                        fetch(imageURL).then((resp) => resp.blob())
                    )
                }
                let blobImg = MyCache.get('blobPromPic' + imageURL)
                blobImg
                    .then((blob) => createImageBitmap(blob))
                    .then(async (img) => {
                        // Make canvas same size as image
                        const canvas = document.createElement('canvas')
                        canvas.width = img.width
                        canvas.height = img.height

                        // Draw image onto canvas
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                        document.body.appendChild(canvas)
                        const imageData = ctx.getImageData(
                            0,
                            0,
                            img.width,
                            img.height
                        )
                        // allocate memory for image
                        imagePointer = WasmWebp.api().createBuffer(
                            imageData.width,
                            imageData.height
                        )
                        WebPMod.HEAP8.set(imageData.data, imagePointer)
                        WasmWebp.api().encode(
                            imagePointer,
                            imageData.width,
                            imageData.height,
                            quality
                        )
                        resultPointer = WasmWebp.api().getResultPointer()
                        const resultSize = WasmWebp.api().getResultSize()
                        const resultView = new Uint8Array(
                            WebPMod.HEAP8.buffer,
                            resultPointer,
                            resultSize
                        )
                        const result = new Uint8Array(resultView)
                        WasmWebp.api().freeResult(resultPointer)
                        WasmWebp.api().destroyBuffer(imagePointer)

                        const blob = new Blob([result], { type: 'image/webp' })
                        const blobURL = window.URL.createObjectURL(blob)

                        return resolve({
                            blobURL,
                            blob,
                            arrayBuffer: await blob.arrayBuffer(),
                            width: imageData.width,
                            height: imageData.height,
                        })
                    })
                    .catch((err) => {
                        if (resultPointer) {
                            WasmWebp.api().freeResult(resultPointer)
                        }
                        if (imagePointer) {
                            WasmWebp.api().destroyBuffer(imagePointer)
                        }
                        reject(err)
                    })
            })
        },
    }

    return {
        encode: WasmWebp.encode,
        Module,
    }
}

let encode = async (url, quality = 1) => {
    return await getWebPMod()
        .then((r) => r.encode(url, quality))
        .then((result) => {
            return result
        })
}
export { encode }

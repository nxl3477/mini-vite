const Koa = require('koa')
const fs = require('fs')
const path = require('path')
const app = new Koa()
const compilerSfc = require('@vue/compiler-sfc')
const compilerDom = require('@vue/compiler-dom')


app.use(async ctx => {
  const { url, query } = ctx
  console.log('url, query', query)

  if( url === '/' ) {
    ctx.type = 'text/html'
    let content = fs.readFileSync('./index.html', 'utf-8')
    content = content.replace('<script', `
    <script>
    window.process = {
      env: {
        NODE_ENV: 'development'
      }
    }
    </script><script`)

    ctx.body = content
  }

  // 处理js
  else if(url.endsWith('.js')) {
    const p = path.resolve(__dirname, url.slice(1))

    const centent = fs.readFileSync(p, 'utf-8')
    ctx.type = 'application/javascript'
    ctx.body = rewriteimport(centent)
  } 
  // 支持node_modules 内模块处理
  else if( url.startsWith('/@modules') ) {
    const prefix = path.resolve(
      __dirname, 
      'node_modules', 
      url.replace('/@modules/', "")
    )

    const packagePath = path.join(prefix, 'package.json')

    const { module, main } = require(packagePath)

    const entryPath = module || main
    
    const entryFile = path.join(prefix, entryPath)
    

    const content = fs.readFileSync(entryFile, 'utf-8')
    ctx.type = 'application/javascript'
    // 处理内部的继续依赖
    ctx.body = rewriteimport(content)
  }
  // vue 但文件组件处理
  // .vue 文件 通过  compiler-sfc 处理
  // template 通过  compiler-dom 转换为 render 函数
  else if( url.indexOf('.vue') > -1 ) {
    const p = path.resolve(__dirname, url.split('?')[0].slice(1))

    const vueContent = fs.readFileSync(p, 'utf-8')
    const {descriptor} = compilerSfc.parse(vueContent)
    console.log('descriptor', descriptor)
    if( !query.type ) {

      ctx.type = 'application/javascript'
  
      // 构造导出
      ctx.body = `
        import { render as __render } from "${url}?type=template"
        ${rewriteimport(
          descriptor.script.content.replace('export default ', "const __script = ")
        )}
        __script.render = __render
        export default __script
      
      `

    }else if( query.type === 'template') {
      // 当携带了 template
      const template = descriptor.template
      const render = compilerDom.compile(template.content, { mode: 'module' })
      ctx.type = 'application/javascript'

      ctx.body = rewriteimport(render.code)
    }

    // else if( query.type === 'setup' ) {
    //   const scriptSetup = descriptor.scriptSetup
    //   ctx.type = 'application/javascript'

    //   console.log('scriptSetup.content', scriptSetup.content)

    //   ctx.body = `
    //    export default ${rewriteimport(scriptSetup.content)}
    //   `
    // }
  }
  // css 文件支持
  else if(url.endsWith('.css')) {
    const p = path.resolve(__dirname, url.slice(1))
    const file = fs.readFileSync(p, 'utf-8')
    const content = `
      const css = "${file.replace(/\n/g, "")}"
      let link = document.createElement('style')
      link.setAttribute('type', 'text/css')
      document.head.appendChild(link)
      link.innerHTML = css
      export default css
    `

    ctx.type = 'application/javascript'

    ctx.body = content
  }
})


function rewriteimport (content) {
  return content.replace(/ from ['|"]([^'"]+)['|"]/g, function (s0, s1) {
    if( s1[0] !== "." && s1[1] !== '/') {
      return ` from '/@modules/${s1}'`;
    } else {
      return s0
    }
  })
}


app.listen(3000, () => {
  console.log('vite start 3000')
})
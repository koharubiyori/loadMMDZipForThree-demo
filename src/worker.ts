import JSZip from 'jszip'
import { SIMULATED_MMD_RESOURCE_FOLDER_FLAG } from './constants'
import { ChannelMassageMaps } from './main'

export interface WorkerMessageMaps {
  zipReady: {
    file: Blob | ArrayBuffer
  }
  initMessageChannel: {
    messageChannelPort: MessagePort
  }
}

// interface MMDData {
//   [filePath: string]: Blob
// }

;(() => {
  let messageChannelPort: MessagePort = null as any  // 用于回传数据的prot
  let mmdData: JSZip | null = null  // 最终解压处理好的mmd数据
  
  // 拦截请求
  self.addEventListener('fetch', (e: any) => {
    // 注意respondWith不能异步执行，有异步流程的要返回一个promise在内部处理(Promise<Response>)
    // const originFetch = () => e.respondWith(fetch(e.request))  // 返回原始请求
    if (!mmdData) { return }

    const [_, simulatedFolderName, pmxPath] = e.request.url.replace(e.target.origin + '/', '').match(/^(.+?)\/(.+)$/)
    if (simulatedFolderName !== SIMULATED_MMD_RESOURCE_FOLDER_FLAG) { return }
    if (!(pmxPath in mmdData.files)) { return }

    const response = new Promise(async resolve => {
      const blob = await mmdData!.files[pmxPath].async('blob')
      resolve(new Response(blob))
    })

    e.respondWith(response)    
  })
  
  // 接收传来的消息
  self.addEventListener('message', e => {
    console.log('windowMsg', e)
    
    // 拿一个函数作数据类型映射
    const bindMsgHandler = <T extends keyof WorkerMessageMaps>(type: T, handler: (data: WorkerMessageMaps[T]) => void) => 
      e.data.type === type && handler(e.data.data)

    // 初始化频道消息
    bindMsgHandler('initMessageChannel', data => {
      messageChannelPort = data.messageChannelPort
    })

    // 接收mmd zip
    bindMsgHandler('zipReady', async data => {
      console.log(data)
      mmdData = await unzip(data.file as ArrayBuffer)
      
      // // 提前全部转为blob
      // const mmdBlobs: any = {}
      // await Promise.all(
      //   Object.keys(unzippedData.files).map(async key => {
      //     mmdBlobs[key] = (await unzippedData.files[key].async('blob')) as any
      //   })
      // )
      
      // mmdData = mmdBlobs
      const pmxFileName = Object.keys(mmdData.files).find(item => /\.pmx$/.test(item))!
      // mmd数据准备完毕，通知主线程
      postChannelMessage('mmdDataReady', { pmxFileName })
    })
  })
  
  function unzip(zipData: Blob) {
    const zip = new JSZip()
    return zip.loadAsync(zipData)
  }

  function postChannelMessage<T extends keyof ChannelMassageMaps>(type: T, data: ChannelMassageMaps[T]) {
    messageChannelPort.postMessage({ type, data })
  }
})()
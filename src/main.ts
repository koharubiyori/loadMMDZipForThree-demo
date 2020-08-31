import * as THREE from 'three'
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { SIMULATED_MMD_RESOURCE_FOLDER_FLAG } from './constants'
import { WorkerMessageMaps } from './worker'

export interface ChannelMassageMaps {
  mmdDataReady: {
    pmxFileName: string
  }
}

const containerWidth = 300
const containerHeight = 500

;(async () => {
  let currentModel: THREE.Mesh | null = null
  const { scene, camera, renderer } = initScene()
  const worker = await initWorker()

  const uploadInput = document.createElement('input')
  uploadInput.type = 'file'
  document.body.append(uploadInput)
  uploadInput.addEventListener('change', (e: any) => {
    const file: File = e.target.files.item(0)
    postWorkerMessage('zipReady', { file })
  })

  function initScene() {
    // 创建场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('white')
    
    // 创建摄像机
    const camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 1, 2000)
    camera.position.z = 24
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio * 2) // 二倍像素防锯齿
    renderer.setSize(containerWidth, containerHeight)
    document.body.appendChild(renderer.domElement)
    
    // 添加全景光，否则模型是暗的
    const ambient = new THREE.AmbientLight('#eee')
    scene.add(ambient)
  
    return { scene, camera, renderer }
  }

  async function initWorker() {
    // 开启一个serviceWorker，将zip传入，解压并作为数据源，拦截请求
    // 因为MMDLoader根据pmx的材质名自动向同路径下发请求，其他办法均无法做到一个文件加载mmd模型
    const serviceWorkerRegistration = await navigator.serviceWorker.register(window.__mmdPreviewerWorkerPath || '/worker.js')
    await navigator.serviceWorker.ready

    const worker = serviceWorkerRegistration.active!

    // 使用一个messageChannel，将port2传给serviceWorker进行通信
    const messageChannel = new MessageChannel()
    worker.postMessage({ type: 'initMessageChannel', data: { messageChannelPort: messageChannel.port2 }}, [messageChannel.port2])

    messageChannel.port1.onmessage = e => {
      const bindMsgHandler = <T extends keyof ChannelMassageMaps>(type: T, handler: (data: ChannelMassageMaps[T]) => void) => 
        e.data.type === type && handler(e.data.data)

      bindMsgHandler('mmdDataReady', data => {
        // 以这个常量开头的请求会被拦截并去匹配zip包中的数据
        initMMD(`/${SIMULATED_MMD_RESOURCE_FOLDER_FLAG}/${data.pmxFileName}`)
      })
    }

    return worker
  }

  function initMMD(pmxPath: string) {
    const loader = new MMDLoader()
    loader.load(
      pmxPath, 
      mesh => {
        // 移除之前载入的模型
        if (currentModel) scene.remove(currentModel)

        currentModel = mesh
        scene.add(mesh)
        mesh.position.y = -10.5
    
        const render = () => renderer.render(scene, camera)
        
        // 初始化预览控件
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.addEventListener('change', render)
        
        ;(function animateLoop() {
          requestAnimationFrame(animateLoop)
          render()
        })()
      }
    )
  }

  function postWorkerMessage<T extends keyof WorkerMessageMaps>(type: T, data: WorkerMessageMaps[T]) {
    worker.postMessage({ type, data })
  }
})()

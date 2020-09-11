## loadMMDZipForThree-demo

通过serviceWorker载入mmd压缩包，解压后拦截请求喂给three MMDLoader。

## 注意

- serviceWorker在第一次安装时不会生效，需要刷新页面。这个逻辑已经写在了demo里
- 修改worker的代码后，需要关闭所有和当前woker有关的页面，再次打开，woker的代码才会更新，也可以进F12手动更新。具体看[MDN文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- 压缩包要求：zip格式；无密码，分卷；pmx文件在压缩包根目录，其他贴图文件保持原有文件夹结构
- 所有文件名必须为英文，否则会导致请求的文件名被URI编码以及解压出来的文件名编码不一致，如果一定要使用，可以通过`decodeURIComponent()`和iconv-lite库等手动解码(Demo：[MMDPreviewerForMoegirl/src/worker.ts#75](https://github.com/koharubiyori/MMDPreviewerForMoegirl/blob/f10ccfc0432bcdf84189e3d60b086b3038cbe080/src/worker.ts#L75))
- 有些模型pmx文件中保存的贴图文件路径的文件夹名和真正的文件路径大小写不一致，也会导致找不到资源，需要在worker中手动处理(Demo：[MMDPreviewerForMoegirl/src/worker.ts#30](https://github.com/koharubiyori/MMDPreviewerForMoegirl/blob/f10ccfc0432bcdf84189e3d60b086b3038cbe080/src/worker.ts#L30))

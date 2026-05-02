---
name: wechatpay-payment-methods
description: Choose WeChat Pay method (JSAPI/APP/H5/Native/小程序) and configure callback handling.
license: MIT
last_reviewed: 2026-05-02
---

# 微信支付接入

## When to use

Apply this when integrating WeChat Pay (微信支付) into a Chinese-market application. Use it to select the right payment method for your scenario and to configure callback handling correctly.

## 支付方式选型

| 支付方式 | 用户环境 | 典型场景 | 需要 openid | 准入限制 |
|---|---|---|---|---|
| **JSAPI** | 微信内置浏览器 | 公众号商城、扫码进 H5 后在微信内支付 | ✅ | 需已认证服务号 |
| **小程序支付** | 微信小程序 | 小程序商城 | ✅ | 需已认证小程序 |
| **APP支付** | 原生 iOS/Android App | 电商/外卖 App | ❌ | 开放平台移动应用 APPID；不支持小微商户 |
| **H5支付** | 微信以外的手机浏览器 | 手机浏览器商城 | ❌ | 企业/事业/政府/社会组织；不支持个体工商户/小微商户 |
| **Native支付** | PC 浏览器 | PC 网站收银台（用户手机扫码付款） | ❌ | 无特殊 |
| **付款码支付** | 线下收银台 | 超市/便利店（商户扫用户付款码） | ❌ | 仅 V2 接口（XML + MD5/HMAC-SHA256） |

**选型决策**：

1. 线下收银扫用户手机 → **付款码支付**
2. 微信小程序 → **小程序支付**
3. 微信内浏览器（含扫码后跳转的 H5 页面） → **JSAPI**
4. 非微信手机浏览器 → **H5支付**（注意个体工商户/小微商户不可申请）
5. PC 网站，用户手机扫码 → **Native支付**
6. 原生 App → **APP支付**

**常见误判**：「扫码打开的 H5 页面」口语上叫"H5"，但如果在微信内打开，产品上是 **JSAPI**，不是 H5支付。H5支付专指微信外的手机浏览器。

## 商户模式 vs 服务商模式

| 参数 | 商户模式 | 服务商模式 |
|---|---|---|
| 商户号 | `mchid` | `sp_mchid`（服务商）+ `sub_mchid`（子商户） |
| 应用ID | `appid` | `sp_appid` + `sub_appid`（选填） |
| 用户标识 | `openid` | `sp_openid` 或 `sub_openid` |
| 下单路径 | `/v3/pay/transactions/{type}` | `/v3/pay/partner/transactions/{type}` |
| 查单/关单 | 路径含 `mchid` 参数 | 路径含 `sp_mchid` + `sub_mchid` 参数 |
| 退款/账单 | 标准路径 | 相同路径，请求体增加 `sub_mchid` |

服务商模式的标志：参数出现 `sp_mchid`、`sub_mchid`、API 路径含 `/partner/`，或需要代子商户发起支付。

## 下单与调起支付（商户模式，JSAPI 示例）

```go
// Go — 商户模式 JSAPI 下单
import (
    "context"
    "github.com/wechatpay-apiv3/wechatpay-go/core"
    "github.com/wechatpay-apiv3/wechatpay-go/services/payments/jsapi"
)

func prepayJsapi(ctx context.Context, client *core.Client, openid, outTradeNo string, amountFen int64) (string, error) {
    svc := jsapi.JsapiApiService{Client: client}
    resp, _, err := svc.Prepay(ctx, jsapi.PrepayRequest{
        Appid:       core.String("wx_your_appid"),
        Mchid:       core.String("your_mchid"),
        Description: core.String("商品描述"),
        OutTradeNo:  core.String(outTradeNo),
        Amount:      &jsapi.Amount{Total: core.Int64(amountFen)},
        Payer:       &jsapi.Payer{Openid: core.String(openid)},
        NotifyUrl:   core.String("https://example.com/pay/notify"),
    })
    if err != nil {
        return "", err
    }
    return *resp.PrepayId, nil
}
```

调起支付所需的签名（前端 `WeixinJSBridge.invoke` 所需的 `paySign`）须在服务端用私钥生成，不能在前端生成。

## 回调通知处理

notify_url 要求：
- 必须 `https://` 或 `http://` 开头，外网可访问
- **不能是内网地址**（localhost、127.0.0.1、192.168.x.x 均无效）
- URL 不携带参数
- 必须在商户平台设置 APIv3 密钥，否则微信支付不会发送通知

处理规范：

| 规范 | 说明 |
|---|---|
| 5 秒内返回 200/204 | 超时则微信支付认为失败，按固定频次重试（最多 15 次） |
| 幂等处理 | 先按订单号检查是否已处理，已处理则直接返回成功 |
| 先应答再处理 | 立即返回 200，再异步执行业务逻辑（加款/发货等） |
| 不做登录态校验 | notify_url 不要求用户登录，否则返回 401/403 导致持续重试 |

重试频次：15s → 15s → 30s → 3m → 10m → 20m → 30m × 3 → 60m → 3h × 3 → 6h × 2（最多 15 次）。

防火墙须对微信支付回调 IP 白名单放行：`101.226.103.0/25`、`140.207.54.0/25`、`183.3.234.0/25`、`58.251.80.0/25`（完整列表见官方文档）。

```go
// Go — 回调处理示例骨架
func notifyHandler(w http.ResponseWriter, r *http.Request) {
    // 1. 验签（用官方 SDK handler，或手动验 Wechatpay-Signature 头）
    // 2. 解密 resource.ciphertext（AES-256-GCM，密钥为 APIv3 密钥）
    // 3. 幂等检查
    orderNo := decryptedBody.OutTradeNo
    if isProcessed(orderNo) {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"code": "SUCCESS"})
        return
    }
    // 4. 先返回 200，再异步处理
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"code": "SUCCESS"})
    go fulfillOrder(decryptedBody)
}
```

## 合单支付（多子商户场景）

普通收款不需要合单。合单适用于：一笔支付涉及多个子商户（如平台同时向 A 店、B 店下单），用户一次付款，资金分别结算。

下单接口改为 `/v3/combine-transactions/{type}`，查单/关单也使用合单专用接口（按 `combine_out_trade_no`）。退款必须按单个子单发起，无法按合单总单退。

限制：付款码支付不支持合单；小微商户不支持合单；不传 `time_expire` 时默认 7 天有效期。

## When NOT to use

- **付款码支付**：若开发语言不是 Java/Go 且没有对应 SDK，V2 签名（XML + MD5/HMAC-SHA256）容易出错，优先用有官方 SDK 支持的语言。
- **H5支付**：个体工商户和小微商户无法申请；App 内部不能使用 H5支付，必须用 APP支付。
- **Native支付**：二维码不支持相册识别或长按识别，只能用微信「扫一扫」扫码。

## Failure modes

| 问题 | 原因 | 解决 |
|---|---|---|
| 收不到回调 | notify_url 是内网地址或未设置 APIv3 密钥 | 检查 notify_url 可外网访问；在商户平台设置 APIv3 密钥 |
| 回调重复触发业务 | 未做幂等，微信支付重试时重复执行 | 先查订单状态，已处理则直接返回 SUCCESS |
| 付款码支付卡在 USERPAYING | 未实现轮询查单和超时撤销 | 付款码支付必须实现查单轮询（建议 3s 一次）+ 30s 超时后调撤销接口 |
| JSAPI 调起支付失败 | JSAPI 授权目录未配置当前域名，或签名错误 | 检查商户平台 JSAPI 授权目录配置；检查调起签名的时间戳、随机串、package 参数 |
| H5支付跳转后无法回到商户页 | redirect_url 未做 URL encode | `h5_url` 后拼接时对 redirect_url 做 encodeURIComponent |

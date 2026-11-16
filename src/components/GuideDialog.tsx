import { Download, FileUp, Keyboard, Search, ShieldCheck, Star, Users } from 'lucide-react'
import { Modal } from './Modal'

interface GuideDialogProps {
  open: boolean
  onClose: () => void
}

export function GuideDialog({ open, onClose }: GuideDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="QUICK START"
      title="使用说明"
      size="md"
      footer={
        <div className="footer-actions footer-actions-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            开始使用
          </button>
        </div>
      }
    >
      <div className="guide">
        <p className="guide-lead">
          拾光通讯录是一个本地优先的个人通讯录。它把「重要的人」和「完整的联系方式」放在同一个视野里，
          并支持 Excel 双向流转。
        </p>

        <div className="guide-features">
          <div>
            <span className="guide-icon guide-icon-gold">
              <Star size={18} />
            </span>
            <strong>一键收藏</strong>
            <p>点击卡片右上角星标，重要联系人会进入「我的收藏」。</p>
          </div>
          <div>
            <span className="guide-icon guide-icon-green">
              <Users size={18} />
            </span>
            <strong>多种联系方式</strong>
            <p>每个联系人可保存多条电话、邮箱、地址和社交账号，并标注用途。</p>
          </div>
          <div>
            <span className="guide-icon guide-icon-blue">
              <FileUp size={18} />
            </span>
            <strong>Excel 导入导出</strong>
            <p>每人一行、每种信息独立成列；导入前可预览并选择合并方式。</p>
          </div>
        </div>

        <div className="guide-block">
          <h3>三步开始</h3>
          <ol className="guide-steps">
            <li>
              <span>01</span>
              <p>
                <strong>新建或导入</strong>
                点击右上角「新建联系人」，或从侧栏导入 Excel。
              </p>
            </li>
            <li>
              <span>02</span>
              <p>
                <strong>补充多种联系方式</strong>
                在编辑弹窗中为电话、邮箱、地址、社交账号分别添加多条记录。
              </p>
            </li>
            <li>
              <span>03</span>
              <p>
                <strong>收藏与导出</strong>
                星标常用联系人；需要备份或交接时，一键导出为 Excel。
              </p>
            </li>
          </ol>
        </div>

        <div className="guide-block">
          <h3>
            <Keyboard size={16} /> 快捷键
          </h3>
          <div className="shortcut-list">
            <span>
              <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> 聚焦搜索
            </span>
            <span>
              <kbd>Esc</kbd> 关闭弹窗 / 详情
            </span>
            <span>
              <kbd>Enter</kbd> 打开选中的联系人卡片
            </span>
          </div>
        </div>

        <div className="guide-data">
          <ShieldCheck size={20} />
          <div>
            <strong>你的数据只属于你</strong>
            <p>
              所有联系人都保存在当前浏览器的 localStorage 中，刷新页面不会丢失；不会上传到服务器。
              导出的 Excel 可作为离线备份。
            </p>
          </div>
        </div>

        <div className="guide-links">
          <span>
            <Search size={14} /> 搜索支持姓名、公司、职位、标签和所有联系方式
          </span>
          <span>
            <Download size={14} /> 导出的文件可直接再次导入
          </span>
        </div>
      </div>
    </Modal>
  )
}

import http.server
import socketserver
import webbrowser
import os
import threading
import time

# 设置服务器端口
PORT = 8000

# 获取当前目录
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# 创建自定义的请求处理器，用于显示友好的提示
class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 记录访问日志
        print(f"访问: {self.path}")
        # 调用父类的do_GET方法处理请求
        super().do_GET()
    
    # 禁用日志输出，使控制台更简洁
    def log_message(self, format, *args):
        return

# 启动HTTP服务器的函数
def start_server():
    # 切换到当前目录
    os.chdir(DIRECTORY)
    
    # 创建TCP服务器
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print(f"\n========================================")
        print(f"睡眠盒子网站服务器已启动!")
        print(f"访问地址: http://localhost:{PORT}")
        print(f"========================================")
        print(f"按 Ctrl+C 停止服务器")
        print(f"========================================\n")
        
        try:
            # 启动服务器，一直运行直到被中断
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器正在停止...")
            httpd.shutdown()
            print("服务器已停止")

# 在浏览器中打开网站的函数
def open_browser():
    # 等待服务器启动
    time.sleep(1)
    # 构建URL
    url = f"http://localhost:{PORT}"
    print(f"正在打开浏览器访问: {url}")
    # 在默认浏览器中打开URL
    webbrowser.open(url)

# 主函数
if __name__ == "__main__":
    print("睡眠盒子网站启动器")
    print("正在准备服务器...")
    
    # 在单独的线程中启动服务器
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True  # 设置为守护线程，主线程结束时自动终止
    server_thread.start()
    
    # 打开浏览器
    open_browser()
    
    try:
        # 保持主线程运行
        while server_thread.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在退出...")

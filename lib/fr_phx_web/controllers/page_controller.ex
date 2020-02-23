defmodule FrPhxWeb.PageController do
  use FrPhxWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def broadcast(conn, _params) do
    render(conn, "broadcast.html")
  end
  
end

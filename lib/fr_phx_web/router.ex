defmodule FrPhxWeb.Router do
  use FrPhxWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", FrPhxWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/broadcast", PageController, :broadcast
  end

  # Other scopes may use custom stacks.
  # scope "/api", FrPhxWeb do
  #   pipe_through :api
  # end
end

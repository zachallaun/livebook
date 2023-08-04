defmodule LivebookWeb.Output.ControlComponent do
  use LivebookWeb, :live_component

  @impl true
  def mount(socket) do
    {:ok, socket}
  end

  @impl true
  def render(%{attrs: %{type: :keyboard}} = assigns) do
    ~H"""
    <div
      class="flex"
      id={"#{@id}-root"}
      phx-hook="KeyboardControl"
      data-cell-id={@cell_id}
      data-disable-default-handlers={to_string(Map.get(@attrs, :disable_default_handlers, true))}
      data-enable-on-cell-focus={to_string(Map.get(@attrs, :enable_on_cell_focus, false))}
      data-keydown-enabled={to_string(:keydown in @attrs.events)}
      data-keyup-enabled={to_string(:keyup in @attrs.events)}
      data-target={@myself}
    >
      <span class="tooltip right" data-tooltip="Toggle keyboard control">
        <button
          class="button-base button-gray button-square-icon"
          type="button"
          aria-label="toggle keyboard control"
        >
          <.remix_icon icon="keyboard-line" />
        </button>
      </span>
    </div>
    """
  end

  def render(%{attrs: %{type: :button}} = assigns) do
    ~H"""
    <div class="flex">
      <button
        class="button-base button-gray"
        type="button"
        phx-click={JS.push("button_click", target: @myself)}
      >
        <%= @attrs.label %>
      </button>
    </div>
    """
  end

  def render(%{attrs: %{type: :form}} = assigns) do
    ~H"""
    <div>
      <.live_component
        module={LivebookWeb.Output.ControlFormComponent}
        id={@id}
        attrs={@attrs}
        input_views={@input_views}
        session_pid={@session_pid}
        client_id={@client_id}
      />
    </div>
    """
  end

  def render(assigns) do
    ~H"""
    <div class="text-red-600">
      Unknown control type <%= @attrs.type %>
    </div>
    """
  end

  @impl true
  def handle_event("enable_keyboard", %{}, socket) do
    maybe_report_status(socket, true)
    {:noreply, socket}
  end

  def handle_event("disable_keyboard", %{}, socket) do
    maybe_report_status(socket, false)
    {:noreply, socket}
  end

  def handle_event("button_click", %{}, socket) do
    report_event(socket, %{type: :click})
    {:noreply, socket}
  end

  def handle_event("keydown", %{"key" => key}, socket) do
    report_event(socket, %{type: :keydown, key: key})
    {:noreply, socket}
  end

  def handle_event("keyup", %{"key" => key}, socket) do
    report_event(socket, %{type: :keyup, key: key})
    {:noreply, socket}
  end

  defp maybe_report_status(socket, status) do
    if :status in socket.assigns.attrs.events do
      report_event(socket, %{type: :status, enabled: status})
    end
  end

  defp report_event(socket, attrs) do
    topic = socket.assigns.attrs.ref
    event = Map.merge(%{origin: socket.assigns.client_id}, attrs)
    send(socket.assigns.attrs.destination, {:event, topic, event})
  end
end

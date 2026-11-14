return {
  {
    'EdenEast/nightfox.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      require('nightfox').setup({
        options = {
          transparent = vim.uv.os_uname().sysname == 'Darwin'
            or string.find(vim.uv.os_uname().sysname, 'Windows') ~= nil
            or string.find(vim.uv.os_uname().release, 'WSL') ~= nil,
        },
      })

      vim.cmd('colorscheme carbonfox')
    end,
  },
}
